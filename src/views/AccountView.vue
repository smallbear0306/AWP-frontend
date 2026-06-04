<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { listAccount, createAccount, updateAccount, deleteAccount, setAccountBalance } from '@/api/account'

const TYPES = ['储蓄卡', '信用卡', '支付宝余额', '微信余额', '花呗', '余额宝', '零钱通', '理财账户', '饭卡', '现金', '其他']

const loading = ref(false)
const list = ref([])

const totalBalance = computed(() => list.value.reduce((s, a) => s + Number(a.balance || 0), 0))
const totalNet = computed(() => list.value.reduce((s, a) => s + Number(a.netAmount || 0), 0))
const totalDebt = computed(() => list.value.reduce((s, a) => s + Number(a.debtTotal || 0), 0))

// 新建/编辑
const dialogVisible = ref(false)
const dialogTitle = ref('')
const editingId = ref(null)
const formRef = ref()
const form = reactive({ name: '', type: '储蓄卡', bank: '', kind: 0, balance: 0 })
const rules = {
  name: [{ required: true, message: '请输入账户名', trigger: 'blur' }],
  type: [{ required: true, message: '请选择类型', trigger: 'change' }],
}

// 划账
const balDialog = ref(false)
const balTarget = ref(null)
const balValue = ref(0)

async function load() {
  loading.value = true
  try { list.value = await listAccount() } finally { loading.value = false }
}

function openCreate() {
  dialogTitle.value = '新建账户'; editingId.value = null
  Object.assign(form, { name: '', type: '储蓄卡', bank: '', kind: 0, balance: 0 })
  dialogVisible.value = true
}
function openEdit(a) {
  dialogTitle.value = '编辑账户'; editingId.value = a.id
  Object.assign(form, { name: a.name, type: a.type, bank: a.bank || '', kind: a.kind, balance: a.balance })
  dialogVisible.value = true
}
async function onSubmit() {
  await formRef.value.validate()
  if (editingId.value) {
    await updateAccount(editingId.value, { name: form.name, type: form.type, bank: form.bank, kind: form.kind })
    ElMessage.success('修改成功')
  } else {
    await createAccount({ name: form.name, type: form.type, bank: form.bank, kind: form.kind, balance: form.balance })
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false; load()
}
async function onDelete(a) {
  await ElMessageBox.confirm(`确定删除账户「${a.name}」？`, '提示', { type: 'warning' })
  await deleteAccount(a.id); ElMessage.success('删除成功'); load()
}

function openBalance(a) {
  balTarget.value = a; balValue.value = Number(a.balance); balDialog.value = true
}
async function onBalanceSubmit() {
  await setAccountBalance(balTarget.value.id, balValue.value)
  ElMessage.success('划账成功')
  balDialog.value = false; load()
}

onMounted(load)
</script>

<template>
  <div v-loading="loading">
    <!-- 汇总 -->
    <el-row :gutter="16" class="summary">
      <el-col :span="8"><el-card><div class="lbl">总余额</div><div class="val">{{ totalBalance.toFixed(2) }}</div></el-card></el-col>
      <el-col :span="8"><el-card><div class="lbl">总负债</div><div class="val debt">{{ totalDebt.toFixed(2) }}</div></el-card></el-col>
      <el-col :span="8"><el-card><div class="lbl">总存额（净值）</div><div class="val" :class="{ neg: totalNet < 0 }">{{ totalNet.toFixed(2) }}</div></el-card></el-col>
    </el-row>

    <el-card>
      <div class="toolbar">
        <span class="hint">余额由记账自动增减；长期未更新可用「划账」按真实余额校正</span>
        <el-button type="primary" @click="openCreate">新建账户</el-button>
      </div>
      <el-table :data="list" border stripe>
        <el-table-column prop="name" label="账户" min-width="130" />
        <el-table-column label="类型" width="150">
          <template #default="{ row }">
            {{ row.type }}<span v-if="row.bank"> · {{ row.bank }}</span>
            <el-tag size="small" :type="row.kind === 1 ? 'warning' : 'info'" style="margin-left:6px">
              {{ row.kind === 1 ? '信用' : '储蓄' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="余额" width="120">
          <template #default="{ row }">{{ Number(row.balance).toFixed(2) }}</template>
        </el-table-column>
        <el-table-column label="负债" width="110">
          <template #default="{ row }">
            <span :style="{ color: Number(row.debtTotal) > 0 ? '#f56c6c' : '#909399' }">{{ Number(row.debtTotal || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="存额" width="120">
          <template #default="{ row }">
            <span :style="{ color: Number(row.netAmount) < 0 ? '#f56c6c' : '#303133', fontWeight: 'bold' }">{{ Number(row.netAmount).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200">
          <template #default="{ row }">
            <el-button link type="primary" @click="openBalance(row)">划账</el-button>
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新建/编辑 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="440px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="账户名" prop="name">
          <el-input v-model="form.name" placeholder="如：招行储蓄卡、我的支付宝" />
        </el-form-item>
        <el-form-item label="类型" prop="type">
          <el-select v-model="form.type" style="width: 100%">
            <el-option v-for="t in TYPES" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="银行">
          <el-input v-model="form.bank" placeholder="银行卡类填银行名，可选" />
        </el-form-item>
        <el-form-item label="性质">
          <el-radio-group v-model="form.kind">
            <el-radio :value="0">储蓄</el-radio>
            <el-radio :value="1">信用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="!editingId" label="初始余额">
          <el-input-number v-model="form.balance" :precision="2" :step="100" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="onSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 划账 -->
    <el-dialog v-model="balDialog" title="划账 / 更新余额" width="380px">
      <p class="bal-tip">把「{{ balTarget?.name }}」的余额校正为真实值：</p>
      <el-input-number v-model="balValue" :precision="2" :step="100" style="width: 100%" />
      <template #footer>
        <el-button @click="balDialog = false">取消</el-button>
        <el-button type="primary" @click="onBalanceSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.summary { margin-bottom: 16px; }
.lbl { font-size: 13px; color: #909399; }
.val { font-size: 24px; font-weight: bold; margin-top: 6px; }
.val.debt { color: #f56c6c; }
.val.neg { color: #f56c6c; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.hint { font-size: 12px; color: #909399; }
.bal-tip { margin-bottom: 10px; color: #606266; font-size: 14px; }
</style>
