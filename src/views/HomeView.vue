<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { pageRecord, createRecord, updateRecord, deleteRecord } from '@/api/record'
import { getCategoryTree } from '@/api/category'

const loading = ref(false)
const list = ref([])
const total = ref(0)
const tree = ref([]) // 全量分类树（含支出与收入）

const query = reactive({
  page: 1,
  size: 10,
  type: null,
  categoryId: null,
  parentCategoryId: null,
  startDate: null,
  endDate: null,
})
const dateRange = ref([])
const filterCat = ref([]) // 过滤级联值：[一级] 或 [一级, 二级]

// 级联选择器配置
const cascaderProps = { value: 'id', label: 'name', children: 'children' }
const filterCascaderProps = { ...cascaderProps, checkStrictly: true }

// 弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('')
const editingId = ref(null)
const formRef = ref()
const form = reactive({ type: 0, amount: null, remark: '', recordDate: '', catPath: [] })

const rules = {
  catPath: [{ required: true, message: '请选择分类', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  recordDate: [{ required: true, message: '请选择日期', trigger: 'change' }],
}

// 弹窗内按所选类型过滤分类树
const formCatOptions = computed(() => tree.value.filter((n) => n.type === form.type))

async function loadTree() {
  tree.value = await getCategoryTree()
}

async function load() {
  loading.value = true
  try {
    if (dateRange.value && dateRange.value.length === 2) {
      query.startDate = dateRange.value[0]
      query.endDate = dateRange.value[1]
    } else {
      query.startDate = null
      query.endDate = null
    }
    const data = await pageRecord(query)
    list.value = data.list
    total.value = data.total
  } finally {
    loading.value = false
  }
}

// 过滤分类级联变化：长度1=按一级过滤，长度2=按二级过滤
function onFilterCatChange(val) {
  query.categoryId = null
  query.parentCategoryId = null
  if (val && val.length === 1) query.parentCategoryId = val[0]
  else if (val && val.length === 2) query.categoryId = val[1]
}

function onSearch() {
  query.page = 1
  load()
}

function onReset() {
  query.type = null
  query.categoryId = null
  query.parentCategoryId = null
  filterCat.value = []
  dateRange.value = []
  query.page = 1
  load()
}

function openCreate() {
  dialogTitle.value = '记一笔'
  editingId.value = null
  Object.assign(form, {
    type: 0,
    amount: null,
    remark: '',
    recordDate: new Date().toISOString().slice(0, 10),
    catPath: [],
  })
  dialogVisible.value = true
}

function openEdit(row) {
  dialogTitle.value = '编辑账单'
  editingId.value = row.id
  Object.assign(form, {
    type: row.type,
    amount: row.amount,
    remark: row.remark || '',
    recordDate: row.recordDate,
    catPath: [row.parentCategoryId, row.categoryId],
  })
  dialogVisible.value = true
}

// 类型切换时清空已选分类（避免类型与分类不一致）
function onTypeChange() {
  form.catPath = []
}

async function onSubmit() {
  await formRef.value.validate()
  const categoryId = form.catPath[form.catPath.length - 1]
  const payload = {
    categoryId,
    type: form.type,
    amount: form.amount,
    remark: form.remark,
    recordDate: form.recordDate,
  }
  if (editingId.value) {
    await updateRecord(editingId.value, payload)
    ElMessage.success('修改成功')
  } else {
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

onMounted(() => {
  loadTree()
  load()
})
</script>

<template>
  <el-card>
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-select v-model="query.type" placeholder="全部类型" clearable style="width: 120px">
        <el-option label="支出" :value="0" />
        <el-option label="收入" :value="1" />
      </el-select>
      <el-cascader
        v-model="filterCat"
        :options="tree"
        :props="filterCascaderProps"
        placeholder="全部分类"
        clearable
        style="width: 240px"
        @change="onFilterCatChange"
      />
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width: 240px"
      />
      <el-button type="primary" @click="onSearch">查询</el-button>
      <el-button @click="onReset">重置</el-button>
      <el-button type="success" style="margin-left: auto" @click="openCreate">记一笔</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="recordDate" label="日期" width="120" />
      <el-table-column label="分类" min-width="160">
        <template #default="{ row }">
          {{ row.parentCategoryName }} <span class="sep">/</span> {{ row.categoryName }}
        </template>
      </el-table-column>
      <el-table-column label="类型" width="90">
        <template #default="{ row }">
          <el-tag :type="row.type === 1 ? 'success' : 'danger'">
            {{ row.type === 1 ? '收入' : '支出' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="120">
        <template #default="{ row }">
          <span :style="{ color: row.type === 1 ? '#67c23a' : '#f56c6c' }">
            {{ row.type === 1 ? '+' : '-' }}{{ Number(row.amount).toFixed(2) }}
          </span>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      layout="total, prev, pager, next"
      :total="total"
      :page-size="query.size"
      :current-page="query.page"
      @current-change="(p) => { query.page = p; load() }"
    />

    <!-- 记账弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="460px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type" @change="onTypeChange">
            <el-radio :value="0">支出</el-radio>
            <el-radio :value="1">收入</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="分类" prop="catPath">
          <el-cascader
            v-model="form.catPath"
            :options="formCatOptions"
            :props="cascaderProps"
            placeholder="选择一级 / 二级分类"
            style="width: 100%"
          />
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
  </el-card>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.sep {
  color: #c0c4cc;
  margin: 0 2px;
}
.pager {
  margin-top: 16px;
  justify-content: flex-end;
}
</style>
