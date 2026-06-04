<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  pageRecord, createRecord, updateRecord, deleteRecord,
  recognizeRecord, getRecordImage,
} from '@/api/record'
import { getCategoryTree } from '@/api/category'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const tree = ref([]) // 全量分类树（含支出与收入）

const query = reactive({
  page: 1, size: 10, type: null, categoryId: null, parentCategoryId: null, startDate: null, endDate: null,
})
const dateRange = ref([])
const filterCat = ref([])

const cascaderProps = { value: 'id', label: 'name', children: 'children' }
const filterCascaderProps = { ...cascaderProps, checkStrictly: true }

// 记账弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('')
const editingId = ref(null)
const formRef = ref()
const recognizing = ref(false)
const form = reactive({
  type: 0, amount: null, remark: '', recordDate: '', catPath: [],
  imageBase64: '',     // 新增时随账单入库的压缩图
  imagePreview: '',    // 弹窗内预览用 data URL
})

const rules = {
  catPath: [{ required: true, message: '请选择分类', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  recordDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
}

const formCatOptions = computed(() => tree.value.filter((n) => n.type === form.type))

// 详情弹窗
const detailVisible = ref(false)
const detail = ref({})
const detailImage = ref('')
const detailImgLoading = ref(false)

async function loadTree() {
  tree.value = await getCategoryTree()
}

async function load() {
  loading.value = true
  try {
    if (dateRange.value && dateRange.value.length === 2) {
      query.startDate = dateRange.value[0]; query.endDate = dateRange.value[1]
    } else { query.startDate = null; query.endDate = null }
    const data = await pageRecord(query)
    list.value = data.list
    total.value = data.total
  } finally { loading.value = false }
}

function onFilterCatChange(val) {
  query.categoryId = null; query.parentCategoryId = null
  if (val && val.length === 1) query.parentCategoryId = val[0]
  else if (val && val.length === 2) query.categoryId = val[1]
}
function onSearch() { query.page = 1; load() }
function onReset() {
  query.type = null; query.categoryId = null; query.parentCategoryId = null
  filterCat.value = []; dateRange.value = []; query.page = 1; load()
}

function resetForm() {
  Object.assign(form, {
    type: 0, amount: null, remark: '',
    recordDate: new Date().toISOString().slice(0, 10),
    catPath: [], imageBase64: '', imagePreview: '',
  })
}

function openCreate() {
  dialogTitle.value = '记一笔'; editingId.value = null; resetForm()
  dialogVisible.value = true
}

function openEdit(row) {
  dialogTitle.value = '编辑账单'; editingId.value = row.id
  Object.assign(form, {
    type: row.type, amount: row.amount, remark: row.remark || '',
    recordDate: row.recordDate, catPath: [row.parentCategoryId, row.categoryId],
    imageBase64: '', imagePreview: '',
  })
  // 编辑时若已有截图，拉来预览（编辑不改图）
  if (row.hasImage === 1) {
    getRecordImage(row.id).then((r) => { form.imagePreview = r.image }).catch(() => {})
  }
  dialogVisible.value = true
}

// 选择截图 → 上传识别 → 预填
async function onPickImage(uploadFile) {
  const raw = uploadFile.raw || uploadFile
  recognizing.value = true
  try {
    const r = await recognizeRecord(raw)
    if (r.imageBase64) {
      form.imageBase64 = r.imageBase64
      form.imagePreview = 'data:image/jpeg;base64,' + r.imageBase64
    }
    if (r.recognized) {
      if (r.type !== null && r.type !== undefined) form.type = r.type
      if (r.amount !== null && r.amount !== undefined) form.amount = Number(r.amount)
      if (r.recordDate) form.recordDate = r.recordDate
      if (r.remark) form.remark = r.remark
      if (r.categoryId && r.parentCategoryId) form.catPath = [r.parentCategoryId, r.categoryId]
      ElMessage.success('已识别并预填，请核对后提交')
    } else {
      ElMessage.warning(r.message || '未能自动识别，请手动填写')
    }
  } catch (e) {
    // 拦截器已提示
  } finally {
    recognizing.value = false
  }
}

function removeImage() {
  form.imageBase64 = ''; form.imagePreview = ''
}

function onTypeChange() { form.catPath = [] }

async function onSubmit() {
  await formRef.value.validate()
  const categoryId = form.catPath[form.catPath.length - 1]
  const payload = {
    categoryId, type: form.type, amount: form.amount,
    remark: form.remark, recordDate: form.recordDate,
  }
  if (editingId.value) {
    await updateRecord(editingId.value, payload)
    ElMessage.success('修改成功')
  } else {
    if (form.imageBase64) payload.imageBase64 = form.imageBase64
    await createRecord(payload)
    ElMessage.success('记账成功')
  }
  dialogVisible.value = false
  load()
}

async function onDelete(row) {
  await ElMessageBox.confirm('确定删除这条账单？', '提示', { type: 'warning' })
  await deleteRecord(row.id)
  ElMessage.success('删除成功')
  load()
}

// 点击行 → 详情
async function openDetail(row) {
  detail.value = row
  detailImage.value = ''
  detailVisible.value = true
  if (row.hasImage === 1) {
    detailImgLoading.value = true
    try {
      const r = await getRecordImage(row.id)
      detailImage.value = r.image
    } catch { /* ignore */ } finally {
      detailImgLoading.value = false
    }
  }
}

onMounted(() => { loadTree(); load() })
</script>

<template>
  <el-card>
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select v-model="query.type" placeholder="全部类型" clearable style="width: 120px">
        <el-option label="支出" :value="0" />
        <el-option label="收入" :value="1" />
      </el-select>
      <el-cascader v-model="filterCat" :options="tree" :props="filterCascaderProps"
        placeholder="全部分类" clearable style="width: 240px" @change="onFilterCatChange" />
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
        start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 240px" />
      <el-button type="primary" @click="onSearch">查询</el-button>
      <el-button @click="onReset">重置</el-button>
      <el-button type="success" style="margin-left: auto" @click="openCreate">记一笔</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe @row-click="openDetail" class="clickable">
      <el-table-column prop="recordDate" label="日期" width="115" />
      <el-table-column label="分类" min-width="150">
        <template #default="{ row }">
          {{ row.parentCategoryName }} <span class="sep">/</span> {{ row.categoryName }}
          <el-icon v-if="row.hasImage === 1" class="clip" title="有截图"><Paperclip /></el-icon>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="80">
        <template #default="{ row }">
          <el-tag :type="row.type === 1 ? 'success' : 'danger'">{{ row.type === 1 ? '收入' : '支出' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="110">
        <template #default="{ row }">
          <span :style="{ color: row.type === 1 ? '#67c23a' : '#f56c6c' }">
            {{ row.type === 1 ? '+' : '-' }}{{ Number(row.amount).toFixed(2) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button link type="primary" @click.stop="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click.stop="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination class="pager" layout="total, prev, pager, next" :total="total"
      :page-size="query.size" :current-page="query.page"
      @current-change="(p) => { query.page = p; load() }" />

    <!-- 记账弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="460px">
      <!-- 截图识别（仅新增时可上传） -->
      <div v-if="!editingId" class="upload-area">
        <el-upload :show-file-list="false" :auto-upload="false" accept="image/*" :on-change="onPickImage">
          <el-button type="primary" plain :loading="recognizing" :icon="recognizing ? '' : 'UploadFilled'">
            {{ recognizing ? '识别中…' : '上传截图自动识别' }}
          </el-button>
        </el-upload>
        <span class="upload-tip">支付宝/微信/银行/淘宝/拼多多等截图，自动填金额、日期、分类</span>
      </div>
      <div v-if="form.imagePreview" class="preview">
        <el-image :src="form.imagePreview" fit="contain" style="max-height: 180px" :preview-src-list="[form.imagePreview]" />
        <el-button v-if="!editingId" link type="danger" size="small" @click="removeImage">移除</el-button>
      </div>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type" @change="onTypeChange">
            <el-radio :value="0">支出</el-radio>
            <el-radio :value="1">收入</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分类" prop="catPath">
          <el-cascader v-model="form.catPath" :options="formCatOptions" :props="cascaderProps"
            placeholder="选择一级 / 二级分类" style="width: 100%" />
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number v-model="form.amount" :min="0.01" :precision="2" :step="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="日期" prop="recordDate">
          <el-date-picker v-model="form.recordDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="可选" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="账单详情" width="480px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="日期">{{ detail.recordDate }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ detail.parentCategoryName }} / {{ detail.categoryName }}</el-descriptions-item>
        <el-descriptions-item label="类型">{{ detail.type === 1 ? '收入' : '支出' }}</el-descriptions-item>
        <el-descriptions-item label="金额">
          <span :style="{ color: detail.type === 1 ? '#67c23a' : '#f56c6c' }">
            {{ detail.type === 1 ? '+' : '-' }}{{ Number(detail.amount || 0).toFixed(2) }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="备注">{{ detail.remark || '—' }}</el-descriptions-item>
      </el-descriptions>
      <div class="detail-img">
        <div v-if="detailImgLoading">截图加载中…</div>
        <el-image v-else-if="detailImage" :src="detailImage" fit="contain"
          style="max-width: 100%" :preview-src-list="[detailImage]" />
        <div v-else-if="detail.hasImage !== 1" class="no-img">（无截图）</div>
      </div>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.filter-bar { display: flex; gap: 12px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.sep { color: #c0c4cc; margin: 0 2px; }
.clip { color: #909399; margin-left: 4px; vertical-align: middle; }
.clickable :deep(.el-table__row) { cursor: pointer; }
.pager { margin-top: 16px; justify-content: flex-end; }
.upload-area { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.upload-tip { font-size: 12px; color: #909399; }
.preview { margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }
.detail-img { margin-top: 14px; text-align: center; }
.no-img { color: #909399; font-size: 13px; }
</style>
