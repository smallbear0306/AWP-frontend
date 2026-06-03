<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCategoryTree, createCategory, updateCategory, deleteCategory } from '@/api/category'

const loading = ref(false)
const activeType = ref('0') // '0' 支出 / '1' 收入
const treeAll = ref([])

const treeData = computed(() =>
  treeAll.value.filter((n) => String(n.type) === activeType.value),
)

const treeProps = { label: 'name', children: 'children' }

// 弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('')
const mode = ref('addTop') // addTop | addSub | edit
const editingId = ref(null)
const formRef = ref()
const form = reactive({ name: '', description: '', icon: '', parentId: null })

const rules = {
  name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
}

async function load() {
  loading.value = true
  try {
    treeAll.value = await getCategoryTree()
  } finally {
    loading.value = false
  }
}

function openAddTop() {
  mode.value = 'addTop'
  dialogTitle.value = `新增一级分类（${activeType.value === '1' ? '收入' : '支出'}）`
  editingId.value = null
  Object.assign(form, { name: '', description: '', icon: '', parentId: null })
  dialogVisible.value = true
}

function openAddSub(parent) {
  mode.value = 'addSub'
  dialogTitle.value = `在「${parent.name}」下新增二级分类`
  editingId.value = null
  Object.assign(form, { name: '', description: '', icon: '', parentId: parent.id })
  dialogVisible.value = true
}

function openEdit(node) {
  mode.value = 'edit'
  dialogTitle.value = `编辑「${node.name}」`
  editingId.value = node.id
  Object.assign(form, {
    name: node.name,
    description: node.description || '',
    icon: node.icon || '',
    parentId: node.parentId,
  })
  dialogVisible.value = true
}

async function onSubmit() {
  await formRef.value.validate()
  const type = Number(activeType.value)
  if (mode.value === 'edit') {
    await updateCategory(editingId.value, {
      name: form.name,
      type,
      description: form.description,
      icon: form.icon,
    })
    ElMessage.success('修改成功')
  } else {
    await createCategory({
      parentId: form.parentId,
      name: form.name,
      type,
      description: form.description,
      icon: form.icon,
    })
    ElMessage.success('新增成功')
  }
  dialogVisible.value = false
  load()
}

async function onDelete(node) {
  await ElMessageBox.confirm(`确定删除分类「${node.name}」？`, '提示', { type: 'warning' })
  await deleteCategory(node.id)
  ElMessage.success('删除成功')
  load()
}

onMounted(load)
</script>

<template>
  <el-card v-loading="loading">
    <div class="toolbar">
      <el-radio-group v-model="activeType">
        <el-radio-button label="0">支出</el-radio-button>
        <el-radio-button label="1">收入</el-radio-button>
      </el-radio-group>
      <el-button type="primary" @click="openAddTop">新增一级分类</el-button>
    </div>

    <el-tree
      :data="treeData"
      :props="treeProps"
      node-key="id"
      default-expand-all
      :expand-on-click-node="false"
    >
      <template #default="{ data }">
        <div class="node">
          <span class="node-name">{{ data.name }}</span>
          <span v-if="data.description" class="node-desc">（{{ data.description }}）</span>
          <el-tag v-if="data.system" size="small" type="info" class="node-tag">预设</el-tag>
          <el-tag v-else size="small" type="success" class="node-tag">自定义</el-tag>

          <span class="node-actions">
            <!-- 一级节点可加二级 -->
            <el-button v-if="data.parentId == null" link type="primary" size="small" @click.stop="openAddSub(data)">
              加二级
            </el-button>
            <!-- 仅自定义可改/删 -->
            <template v-if="!data.system">
              <el-button link type="primary" size="small" @click.stop="openEdit(data)">编辑</el-button>
              <el-button link type="danger" size="small" @click.stop="onDelete(data)">删除</el-button>
            </template>
          </span>
        </div>
      </template>
    </el-tree>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="440px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="分类名称" />
        </el-form-item>
        <el-form-item label="说明">
          <el-input v-model="form.description" placeholder="可选，如「油费/充电」，作提示展示" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" placeholder="可选" />
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
.node {
  display: flex;
  align-items: center;
  width: 100%;
}
.node-name {
  font-size: 14px;
}
.node-desc {
  color: #909399;
  font-size: 12px;
}
.node-tag {
  margin-left: 8px;
}
.node-actions {
  margin-left: auto;
  padding-right: 8px;
}
</style>
