<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getCategoryTree, createCategory, updateCategory, deleteCategory } from '@/api/category'
import { l1Icon, categoryIcon } from '@/utils/categoryIcon'

const loading = ref(false)
const activeType = ref('0') // '0' 支出 / '1' 收入
const treeAll = ref([])
const treeData = computed(() => treeAll.value.filter((n) => String(n.type) === activeType.value))

// 弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('')
const mode = ref('addTop') // addTop | addSub | edit
const editingId = ref(null)
const formRef = ref()
const form = reactive({ name: '', type: 0, description: '', icon: '', parentId: null })
const rules = { name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }] }

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
  Object.assign(form, { name: '', type: 0, description: '', icon: '', parentId: null })
  dialogVisible.value = true
}
function openAddSub(parent) {
  mode.value = 'addSub'
  dialogTitle.value = `在「${parent.name}」下新增二级分类`
  editingId.value = null
  Object.assign(form, { name: '', type: 0, description: '', icon: '', parentId: parent.id })
  dialogVisible.value = true
}
function openEdit(node) {
  mode.value = 'edit'
  dialogTitle.value = `编辑「${node.name}」`
  editingId.value = node.id
  Object.assign(form, { name: node.name, type: 0, description: node.description || '', icon: node.icon || '', parentId: node.parentId })
  dialogVisible.value = true
}
async function onSubmit() {
  await formRef.value.validate()
  const type = Number(activeType.value)
  if (mode.value === 'edit') {
    await updateCategory(editingId.value, { name: form.name, type, description: form.description, icon: form.icon })
    ElMessage.success('修改成功')
  } else {
    await createCategory({ parentId: form.parentId, name: form.name, type, description: form.description, icon: form.icon })
    ElMessage.success('新增成功')
  }
  dialogVisible.value = false
  load()
}
async function onDelete(node) {
  const hasChildren = node.parentId == null && node.children && node.children.length > 0
  const msg = hasChildren
    ? `确定删除一级分类「${node.name}」？其下 ${node.children.length} 个二级分类将一并删除。`
    : `确定删除分类「${node.name}」？`
  await ElMessageBox.confirm(msg, '提示', { type: 'warning' })
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

    <!-- 一级分类：折叠面板，默认全部收起 -->
    <el-collapse>
      <el-collapse-item v-for="top in treeData" :key="top.id" :name="top.id">
        <template #title>
          <div class="l1-title">
            <el-icon class="l1-icon"><component :is="l1Icon(top.name)" /></el-icon>
            <span class="l1-name">{{ top.name }}</span>
            <span class="l1-count">{{ (top.children || []).length }} 项</span>
            <span class="l1-actions">
              <el-button link type="primary" size="small" @click.stop="openAddSub(top)">加二级</el-button>
              <el-button link type="primary" size="small" @click.stop="openEdit(top)">编辑</el-button>
              <el-button link type="danger" size="small" @click.stop="onDelete(top)">删除</el-button>
            </span>
          </div>
        </template>

        <div class="grid">
          <div v-for="c in top.children" :key="c.id" class="cell">
            <el-icon class="cell-icon"><component :is="categoryIcon(c.name, top.name)" /></el-icon>
            <div class="cell-name">{{ c.name }}</div>
            <div v-if="c.description" class="cell-desc">{{ c.description }}</div>
            <div class="cell-actions">
              <el-icon class="act" title="编辑" @click="openEdit(c)"><Edit /></el-icon>
              <el-icon class="act del" title="删除" @click="onDelete(c)"><Delete /></el-icon>
            </div>
          </div>
          <div v-if="!(top.children || []).length" class="empty">暂无二级分类，点上方「加二级」添加</div>
        </div>
      </el-collapse-item>
    </el-collapse>

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
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.l1-title { display: flex; align-items: center; width: 100%; gap: 8px; }
.l1-icon { font-size: 18px; color: #409eff; }
.l1-name { font-size: 15px; font-weight: 600; }
.l1-count { font-size: 12px; color: #909399; }
.l1-actions { margin-left: auto; padding-right: 12px; }
.grid { display: flex; flex-wrap: wrap; gap: 12px; padding: 6px 4px 10px; }
.cell {
  position: relative;
  width: 92px;
  padding: 12px 6px 10px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  text-align: center;
  transition: box-shadow .2s, border-color .2s;
}
.cell:hover { border-color: #c6e2ff; box-shadow: 0 2px 10px rgba(64,158,255,.15); }
.cell-icon { font-size: 24px; color: #79bbff; }
.cell-name { font-size: 13px; margin-top: 6px; color: #303133; }
.cell-desc { font-size: 11px; color: #909399; margin-top: 2px; }
.cell-actions { position: absolute; top: 4px; right: 4px; display: none; gap: 4px; }
.cell:hover .cell-actions { display: flex; }
.act { font-size: 13px; color: #909399; cursor: pointer; }
.act:hover { color: #409eff; }
.act.del:hover { color: #f56c6c; }
.empty { color: #909399; font-size: 13px; padding: 8px; }
</style>
