<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  pageRecord, createRecord, updateRecord, deleteRecord,
  recognizeRecord, batchCreateRecord, getRecordImage,
} from '@/api/record'
import { getCategoryTree } from '@/api/category'
import { listAccount } from '@/api/account'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const tree = ref([])
const accounts = ref([])
const defaultAccountId = () => (accounts.value[0] ? accounts.value[0].id : null)

const query = reactive({
  page: 1, size: 10, type: null, categoryId: null, parentCategoryId: null, startDate: null, endDate: null,
})
const dateRange = ref([])
const filterCat = ref([])
const cascaderProps = { value: 'id', label: 'name', children: 'children' }
const filterCascaderProps = { ...cascaderProps, checkStrictly: true }

// 手动记一笔
const dialogVisible = ref(false)
const dialogTitle = ref('')
const editingId = ref(null)
const formRef = ref()
const form = reactive({ accountId: null, type: 0, amount: null, remark: '', recordDate: '', catPath: [] })
const rules = {
  accountId: [{ required: true, message: '请选择账户', trigger: 'change' }],
  catPath: [{ required: true, message: '请选择分类', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  recordDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
}
const formCatOptions = computed(() => tree.value.filter((n) => n.type === form.type))

// 截图记账（多笔复核）
const recoVisible = ref(false)
const recognizing = ref(false)
const recoImageB64 = ref('')
const recoImagePreview = ref('')
const recoItems = ref([]) // [{type, catPath:[p,l], amount, recordDate, remark}]
function catOptionsFor(type) { return tree.value.filter((n) => n.type === type) }

// 详情
const detailVisible = ref(false)
const detail = ref({})
const detailImage = ref('')
const detailImgLoading = ref(false)

async function loadTree() { tree.value = await getCategoryTree() }
async function loadAccounts() { accounts.value = await listAccount() }

async function load() {
  loading.value = true
  try {
    if (dateRange.value && dateRange.value.length === 2) {
      query.startDate = dateRange.value[0]; query.endDate = dateRange.value[1]
    } else { query.startDate = null; query.endDate = null }
    const data = await pageRecord(query)
    list.value = data.list; total.value = data.total
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

// ---- 手动记一笔 ----
function openCreate() {
  dialogTitle.value = '记一笔'; editingId.value = null
  Object.assign(form, { accountId: defaultAccountId(), type: 0, amount: null, remark: '', recordDate: new Date().toISOString().slice(0, 10), catPath: [] })
  dialogVisible.value = true
}
function openEdit(row) {
  dialogTitle.value = '编辑账单'; editingId.value = row.id
  Object.assign(form, {
    accountId: row.accountId, type: row.type, amount: row.amount, remark: row.remark || '',
    recordDate: row.recordDate, catPath: [row.parentCategoryId, row.categoryId],
  })
  dialogVisible.value = true
}
function onTypeChange() { form.catPath = [] }
async function onSubmit() {
  await formRef.value.validate()
  const payload = {
    accountId: form.accountId,
    categoryId: form.catPath[form.catPath.length - 1], type: form.type,
    amount: form.amount, remark: form.remark, recordDate: form.recordDate,
  }
  if (editingId.value) { await updateRecord(editingId.value, payload); ElMessage.success('修改成功') }
  else { await createRecord(payload); ElMessage.success('记账成功') }
  dialogVisible.value = false; load()
}
async function onDelete(row) {
  await ElMessageBox.confirm('确定删除这条账单？', '提示', { type: 'warning' })
  await deleteRecord(row.id); ElMessage.success('删除成功'); load()
}

// ---- 截图记账 ----
function openReco() {
  recoImageB64.value = ''; recoImagePreview.value = ''; recoItems.value = []
  recoVisible.value = true
}
async function onPickRecoImage(uploadFile) {
  const raw = uploadFile.raw || uploadFile
  recognizing.value = true
  try {
    const r = await recognizeRecord(raw)
    if (r.imageBase64) {
      recoImageB64.value = r.imageBase64
      recoImagePreview.value = 'data:image/jpeg;base64,' + r.imageBase64
    }
    recoItems.value = (r.items || []).map((it) => ({
      accountId: defaultAccountId(),
      type: it.type ?? 0,
      catPath: it.parentCategoryId && it.categoryId ? [it.parentCategoryId, it.categoryId] : [],
      amount: it.amount != null ? Number(it.amount) : null,
      recordDate: it.recordDate || new Date().toISOString().slice(0, 10),
      remark: it.remark || '',
    }))
    if (r.recognized) ElMessage.success(`识别到 ${recoItems.value.length} 笔，请核对后记账`)
    else ElMessage.warning(r.message || '未能自动识别，可手动添加')
  } catch (e) { /* 拦截器已提示 */ } finally { recognizing.value = false }
}
function addRecoItem() {
  recoItems.value.push({ accountId: defaultAccountId(), type: 0, catPath: [], amount: null, recordDate: new Date().toISOString().slice(0, 10), remark: '' })
}
function removeRecoItem(i) { recoItems.value.splice(i, 1) }
function onRecoTypeChange(item) { item.catPath = [] }

async function onBatchSubmit() {
  if (!recoItems.value.length) { ElMessage.warning('没有可记账的条目'); return }
  for (const [i, it] of recoItems.value.entries()) {
    if (!it.accountId) { ElMessage.warning(`第 ${i + 1} 笔未选择账户`); return }
    if (!it.catPath || it.catPath.length < 2) { ElMessage.warning(`第 ${i + 1} 笔未选择二级分类`); return }
    if (it.amount == null || it.amount <= 0) { ElMessage.warning(`第 ${i + 1} 笔金额无效`); return }
    if (!it.recordDate) { ElMessage.warning(`第 ${i + 1} 笔未选择日期`); return }
  }
  const records = recoItems.value.map((it) => ({
    accountId: it.accountId,
    categoryId: it.catPath[it.catPath.length - 1], type: it.type,
    amount: it.amount, remark: it.remark, recordDate: it.recordDate,
  }))
  await batchCreateRecord({ imageBase64: recoImageB64.value || null, records })
  ElMessage.success(`已记账 ${records.length} 笔`)
  recoVisible.value = false; load()
}

// ---- 详情 ----
async function openDetail(row) {
  detail.value = row; detailImage.value = ''; detailVisible.value = true
  if (row.hasImage === 1) {
    detailImgLoading.value = true
    try { detailImage.value = (await getRecordImage(row.id)).image } catch { /* */ } finally { detailImgLoading.value = false }
  }
}

onMounted(() => { loadTree(); loadAccounts(); load() })
</script>

<template>
  <el-card>
    <div class="filter-bar">
      <el-select v-model="query.type" placeholder="全部类型" clearable style="width: 110px">
        <el-option label="支出" :value="0" /><el-option label="收入" :value="1" />
      </el-select>
      <el-cascader v-model="filterCat" :options="tree" :props="filterCascaderProps"
        placeholder="全部分类" clearable style="width: 220px" @change="onFilterCatChange" />
      <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
        start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 230px" />
      <el-button type="primary" @click="onSearch">查询</el-button>
      <el-button @click="onReset">重置</el-button>
      <el-button type="warning" style="margin-left: auto" @click="openReco">截图记账</el-button>
      <el-button type="success" @click="openCreate">记一笔</el-button>
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
      :page-size="query.size" :current-page="query.page" @current-change="(p) => { query.page = p; load() }" />

    <!-- 手动记一笔 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="460px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="账户" prop="accountId">
          <el-select v-model="form.accountId" placeholder="选择账户" style="width: 100%">
            <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type" @change="onTypeChange">
            <el-radio :value="0">支出</el-radio><el-radio :value="1">收入</el-radio>
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

    <!-- 截图记账（多笔复核） -->
    <el-dialog v-model="recoVisible" title="截图记账" width="720px">
      <div class="reco-top">
        <el-upload :show-file-list="false" :auto-upload="false" accept="image/*" :on-change="onPickRecoImage">
          <el-button type="primary" plain :loading="recognizing">
            {{ recognizing ? '识别中…' : '上传截图自动识别' }}
          </el-button>
        </el-upload>
        <span class="tip">支付宝/微信/银行/淘宝/拼多多/个税等；一张图可能识别出多笔（如个税=收入+个税支出）</span>
      </div>

      <div class="reco-body">
        <div v-if="recoImagePreview" class="reco-img">
          <el-image :src="recoImagePreview" fit="contain" :preview-src-list="[recoImagePreview]" style="max-height: 360px" />
        </div>
        <div class="reco-items">
          <div v-if="!recoItems.length" class="empty">上传截图后，识别出的多笔交易会列在这里，可逐笔核对修改。</div>
          <div v-for="(it, i) in recoItems" :key="i" class="item">
            <div class="item-hd">
              <span>第 {{ i + 1 }} 笔</span>
              <el-button link type="danger" size="small" @click="removeRecoItem(i)">移除</el-button>
            </div>
            <div class="item-row">
              <el-radio-group v-model="it.type" size="small" @change="onRecoTypeChange(it)">
                <el-radio-button :value="0">支出</el-radio-button>
                <el-radio-button :value="1">收入</el-radio-button>
              </el-radio-group>
              <el-input-number v-model="it.amount" :min="0.01" :precision="2" :step="1" size="small" style="width: 130px" />
            </div>
            <div class="item-row">
              <el-select v-model="it.accountId" placeholder="账户" size="small" style="width: 150px">
                <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
              </el-select>
              <el-cascader v-model="it.catPath" :options="catOptionsFor(it.type)" :props="cascaderProps"
                placeholder="一级 / 二级分类" size="small" style="flex: 1" />
            </div>
            <div class="item-row">
              <el-date-picker v-model="it.recordDate" type="date" value-format="YYYY-MM-DD" size="small" style="width: 150px" />
            </div>
            <el-input v-model="it.remark" size="small" placeholder="备注" />
          </div>
          <el-button v-if="recoItems.length" link type="primary" size="small" @click="addRecoItem">+ 再加一笔</el-button>
        </div>
      </div>

      <template #footer>
        <el-button @click="recoVisible = false">取消</el-button>
        <el-button type="primary" :disabled="!recoItems.length" @click="onBatchSubmit">
          确认记账（{{ recoItems.length }} 笔）
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情 -->
    <el-dialog v-model="detailVisible" title="账单详情" width="480px">
      <el-descriptions :column="1" border>
        <el-descriptions-item label="日期">{{ detail.recordDate }}</el-descriptions-item>
        <el-descriptions-item label="账户">{{ detail.accountName || '—' }}</el-descriptions-item>
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
        <el-image v-else-if="detailImage" :src="detailImage" fit="contain" style="max-width: 100%" :preview-src-list="[detailImage]" />
        <div v-else-if="detail.hasImage !== 1" class="no-img">（无截图）</div>
      </div>
    </el-dialog>
  </el-card>
</template>

<style scoped>
.filter-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.sep { color: #c0c4cc; margin: 0 2px; }
.clip { color: #909399; margin-left: 4px; vertical-align: middle; }
.clickable :deep(.el-table__row) { cursor: pointer; }
.pager { margin-top: 16px; justify-content: flex-end; }
.reco-top { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.tip { font-size: 12px; color: #909399; }
.reco-body { display: flex; gap: 16px; }
.reco-img { width: 280px; flex-shrink: 0; text-align: center; }
.reco-items { flex: 1; max-height: 420px; overflow-y: auto; }
.empty { color: #909399; font-size: 13px; padding: 20px 0; }
.item { border: 1px solid #ebeef5; border-radius: 6px; padding: 10px; margin-bottom: 10px; }
.item-hd { display: flex; justify-content: space-between; align-items: center; font-size: 13px; color: #606266; margin-bottom: 8px; }
.item-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.detail-img { margin-top: 14px; text-align: center; }
.no-img { color: #909399; font-size: 13px; }
</style>
