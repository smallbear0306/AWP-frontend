<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listCategory, createCategory, updateCategory, deleteCategory } from '@/api/category'

const loading = ref(false)
const list = ref([])
const filterType = ref(null)

const dialogVisible = ref(false)
const dialogTitle = ref('')
const editingId = ref(null)
const formRef = ref()
const form = reactive({ name: '', type: 0, icon: '' })

const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

async function load() {
  loading.value = true
  try {
    list.value = await listCategory(filterType.value)
  } finally {
    loading.value = false
  }
}

function openCreate() {
  dialogTitle.value = '新增分类'
  editingId.value = null
  Object.assign(form, { name: '', type: 0, icon: '' })
  dialogVisible.value = true
}

function openEdit(row) {
  dialogTitle.value = '编辑分类'
  editingId.value = row.id
  Object.assign(form, { name: row.name, type: row.type, icon: row.icon || '' })
  dialogVisible.value = true
}

async function onSubmit() {
  await formRef.value.validate()
  const payload = { name: form.name, type: form.type, icon: form.icon }
  if (editingId.value) {
    await updateCategory(editingId.value, payload)
    ElMessage.success('修改成功')
  } else {
    await createCategory(payload)
    ElMessage.success('新增成功')
  }
  dialogVisible.value = false
  load()
}

async function onDelete(row) {
  await ElMessageBox.confirm(`确定删除分类「${row.name}」？`, '提示', { type: 'warning' })
  await deleteCategory(row.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>

<template>
  <el-card>
    <div class="toolbar">
      <div>
        <span class="label">类型筛选：</span>
        <el-select v-model="filterType" placeholder="全部" clearable style="width: 140px" @change="load">
          <el-option label="支出" :value="0" />
          <el-option label="收入" :value="1" />
        </el-select>
      </div>
      <el-button type="primary" @click="openCreate">新增分类</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe>
      <el-table-column prop="name" label="名称" />
      <el-table-column label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="row.type === 1 ? 'success' : 'danger'">
            {{ row.type === 1 ? '收入' : '支出' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="icon" label="图标" width="120" />
      <el-table-column label="操作" width="160">
        <template #default="{ row }">
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="onDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="420px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如：餐饮、工资" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-radio-group v-model="form.type">
            <el-radio :value="0">支出</el-radio>
            <el-radio :value="1">收入</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" placeholder="可选，图标标识" />
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
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.label {
  font-size: 14px;
  color: #606266;
}
</style>
