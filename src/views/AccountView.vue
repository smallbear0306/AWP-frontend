<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listAccount, createAccount, batchCreateAccount, updateAccount, deleteAccount, setAccountBalance,
  recognizeAccount, listDebt, createDebt, updateDebt, deleteDebt,
  listInstallments, setInstallmentStatus,
} from '@/api/account'

const router = useRouter()

const METHODS = { 0: '等额本息', 1: '等额本金', 2: '付息后一次还本', 3: '一次性还本息' }
const INST_STATUS = { 0: '未还', 1: '已还', 2: '逾期' }
const INST_TAG = { 0: 'warning', 1: 'success', 2: 'danger' }

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

const recognizing = ref(false)

// 截图导入账户（多条复核）
const importDialog = ref(false)
const importItems = ref([]) // [{name,type,bank,kind,balance}]
function openImport() { importItems.value = []; importDialog.value = true }
async function onImportPick(uploadFile) {
  recognizing.value = true
  try {
    const r = await recognizeAccount(uploadFile.raw || uploadFile)
    importItems.value = (r.items || []).map((it) => ({
      name: it.name || '', type: it.type || '储蓄卡', bank: it.bank || '',
      kind: it.kind ?? 0, balance: it.balance != null ? Number(it.balance) : 0,
    }))
    if (r.recognized) ElMessage.success(`识别到 ${importItems.value.length} 个账户，请核对`)
    else ElMessage.warning(r.message || '未能识别，可手动添加')
  } catch { /* */ } finally { recognizing.value = false }
}
function removeImportItem(i) { importItems.value.splice(i, 1) }
async function onImportSubmit() {
  if (!importItems.value.length) { ElMessage.warning('没有可创建的账户'); return }
  for (const [i, it] of importItems.value.entries()) {
    if (!it.name) { ElMessage.warning(`第 ${i + 1} 个账户名为空`); return }
  }
  await batchCreateAccount({ accounts: importItems.value })
  ElMessage.success(`已创建 ${importItems.value.length} 个账户`)
  importDialog.value = false; load()
}

// 划账
const balDialog = ref(false)
const balTarget = ref(null)
const balValue = ref(0)

// 负债管理
const debtDialog = ref(false)
const debtAccount = ref(null)
const debts = ref([])
const debtEditId = ref(null)
const debtForm = reactive({ name: '', amount: null, rate: 0, type: 0, months: null, repayMethod: 3, dueDate: null, remark: '' })
const debtFormVisible = ref(false)
// 分期明细
const instDialog = ref(false)
const instDebt = ref(null)
const installments = ref([])
// 还款方式可选项随类型变化：一次性只能"一次性还本息"；按月可选前三种
const methodOptions = computed(() => debtForm.type === 0
  ? [{ v: 3, l: '一次性还本息' }]
  : [{ v: 0, l: '等额本息' }, { v: 1, l: '等额本金' }, { v: 2, l: '付息后一次还本' }])
function onDebtTypeChange() { debtForm.repayMethod = debtForm.type === 0 ? 3 : 0 }

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
// 截图识别（划账预填余额，取识别到的第一个账户余额）
async function onRecoBalance(uploadFile) {
  recognizing.value = true
  try {
    const r = await recognizeAccount(uploadFile.raw || uploadFile)
    const it = (r.items || [])[0]
    if (r.recognized && it && it.balance != null) { balValue.value = Number(it.balance); ElMessage.success('已识别余额，请核对') }
    else ElMessage.warning('未识别到余额，请手动填写')
  } catch { /* */ } finally { recognizing.value = false }
}
function goDetail(a) { router.push(`/account/${a.id}`) }
async function onBalanceSubmit() {
  await setAccountBalance(balTarget.value.id, balValue.value)
  ElMessage.success('划账成功')
  balDialog.value = false; load()
}

// ---- 负债 ----
async function openDebts(a) {
  debtAccount.value = a; debtFormVisible.value = false
  debts.value = await listDebt(a.id)
  debtDialog.value = true
}
function openDebtCreate() {
  debtEditId.value = null
  Object.assign(debtForm, { name: '', amount: null, rate: 0, type: 0, months: null, repayMethod: 3, dueDate: null, remark: '' })
  debtFormVisible.value = true
}
function openDebtEdit(d) {
  debtEditId.value = d.id
  Object.assign(debtForm, {
    name: d.name || '', amount: Number(d.principal), rate: d.rate != null ? Number(d.rate) : 0,
    type: d.type, months: d.months, repayMethod: d.repayMethod, dueDate: d.dueDate, remark: d.remark || '',
  })
  debtFormVisible.value = true
}
async function onDebtSubmit() {
  if (debtForm.amount == null || debtForm.amount <= 0) { ElMessage.warning('请输入应还本金'); return }
  if ((debtForm.months == null || debtForm.months < 1)) { ElMessage.warning('请输入期限/期数(月)'); return }
  const payload = { accountId: debtAccount.value.id, ...debtForm }
  if (debtEditId.value) { await updateDebt(debtEditId.value, payload); ElMessage.success('已保存（分期已重算）') }
  else { await createDebt(payload); ElMessage.success('已添加') }
  debtFormVisible.value = false
  debts.value = await listDebt(debtAccount.value.id)
  load() // 刷新存额
}
async function onDebtDelete(d) {
  await ElMessageBox.confirm('确定删除这条负债（含其分期）？', '提示', { type: 'warning' })
  await deleteDebt(d.id)
  debts.value = await listDebt(debtAccount.value.id)
  load()
}
// 分期明细
async function openInstallments(d) {
  instDebt.value = d
  installments.value = await listInstallments(d.id)
  instDialog.value = true
}
async function toggleInstallment(it, status) {
  await setInstallmentStatus(it.id, status)
  installments.value = await listInstallments(instDebt.value.id)
  debts.value = await listDebt(debtAccount.value.id)
  load()
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
        <span class="hint">点账户行看详情；余额由记账自动增减，长期未更新可用「划账」校正</span>
        <span>
          <el-button type="warning" plain @click="openImport">截图导入账户</el-button>
          <el-button type="primary" @click="openCreate">新建账户</el-button>
        </span>
      </div>
      <el-table :data="list" border stripe @row-click="goDetail" class="clickable">
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
        <el-table-column label="操作" width="260">
          <template #default="{ row }">
            <el-button link type="primary" @click.stop="openBalance(row)">划账</el-button>
            <el-button link type="warning" @click.stop="openDebts(row)">负债</el-button>
            <el-button link type="primary" @click.stop="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click.stop="onDelete(row)">删除</el-button>
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

    <!-- 截图导入账户（多条复核） -->
    <el-dialog v-model="importDialog" title="截图导入账户" width="680px">
      <div class="reco-line">
        <el-upload :show-file-list="false" :auto-upload="false" accept="image/*" :on-change="onImportPick">
          <el-button type="primary" plain :loading="recognizing">上传截图自动识别</el-button>
        </el-upload>
        <span class="hint">银行总览/钱包截图，一张图可识别出多个账户，可逐个核对修改</span>
      </div>
      <div v-if="!importItems.length" class="empty-tip">上传后识别到的账户会列在这里。</div>
      <div v-for="(it, i) in importItems" :key="i" class="imp-item">
        <div class="imp-row">
          <el-input v-model="it.name" size="small" placeholder="账户名" style="flex:1" />
          <el-button link type="danger" size="small" @click="removeImportItem(i)">移除</el-button>
        </div>
        <div class="imp-row">
          <el-select v-model="it.type" size="small" style="width:130px">
            <el-option v-for="t in TYPES" :key="t" :label="t" :value="t" />
          </el-select>
          <el-input v-model="it.bank" size="small" placeholder="银行(可选)" style="width:120px" />
          <el-radio-group v-model="it.kind" size="small">
            <el-radio-button :value="0">储蓄</el-radio-button>
            <el-radio-button :value="1">信用</el-radio-button>
          </el-radio-group>
          <el-input-number v-model="it.balance" :precision="2" :step="100" size="small" style="width:140px" />
        </div>
      </div>
      <template #footer>
        <el-button @click="importDialog = false">取消</el-button>
        <el-button type="primary" :disabled="!importItems.length" @click="onImportSubmit">
          创建（{{ importItems.length }} 个）
        </el-button>
      </template>
    </el-dialog>

    <!-- 负债管理 -->
    <el-dialog v-model="debtDialog" :title="`负债管理 · ${debtAccount?.name || ''}`" width="620px">
      <div class="toolbar">
        <span class="hint">存额 = 余额 − 未还款/已逾期负债；已还款不计入</span>
        <el-button type="primary" size="small" @click="openDebtCreate">添加负债</el-button>
      </div>
      <el-table :data="debts" border size="small">
        <el-table-column prop="name" label="说明" min-width="100" />
        <el-table-column label="总额(本息)" min-width="130">
          <template #default="{ row }">
            {{ Number(row.total).toFixed(2) }}
            <div class="months-r">含息 {{ Number(row.interestTotal || 0).toFixed(2) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="方式" width="135">
          <template #default="{ row }">
            {{ row.type === 1 ? '按月' : '一次性' }} · {{ METHODS[row.repayMethod] }}
            <span v-if="row.rate" class="months">· {{ Number(row.rate) }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="进度" width="85"><template #default="{ row }">{{ row.paidPeriods }}/{{ row.periods }}期</template></el-table-column>
        <el-table-column label="未结清" width="100"><template #default="{ row }"><span style="color:#f56c6c">{{ Number(row.outstanding).toFixed(2) }}</span></template></el-table-column>
        <el-table-column label="操作" width="160">
          <template #default="{ row }">
            <el-button link type="success" size="small" @click="openInstallments(row)">分期</el-button>
            <el-button link type="primary" size="small" @click="openDebtEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="onDebtDelete(row)">删</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 负债表单 -->
      <div v-if="debtFormVisible" class="debt-form">
        <el-divider>{{ debtEditId ? '编辑负债（保存会重算分期）' : '添加负债' }}</el-divider>
        <el-form :model="debtForm" label-width="80px" size="small">
          <el-form-item label="说明"><el-input v-model="debtForm.name" placeholder="如：车贷、花呗分期" /></el-form-item>
          <el-form-item label="应还本金"><el-input-number v-model="debtForm.amount" :min="0.01" :precision="2" :step="100" style="width: 100%" /></el-form-item>
          <el-form-item label="年利率%"><el-input-number v-model="debtForm.rate" :min="0" :precision="2" :step="1" style="width: 160px" /><span class="months">　0 表示不计息</span></el-form-item>
          <el-form-item label="类型">
            <el-radio-group v-model="debtForm.type" @change="onDebtTypeChange">
              <el-radio :value="0">一次性</el-radio><el-radio :value="1">按月还款</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item :label="debtForm.type === 1 ? '期数(月)' : '期限(月)'">
            <el-input-number v-model="debtForm.months" :min="1" :step="1" :precision="0" style="width: 160px" />
          </el-form-item>
          <el-form-item label="还款方式">
            <el-select v-model="debtForm.repayMethod" style="width: 100%">
              <el-option v-for="o in methodOptions" :key="o.v" :label="o.l" :value="o.v" />
            </el-select>
          </el-form-item>
          <el-form-item :label="debtForm.type === 1 ? '首期还款日' : '到期日'"><el-date-picker v-model="debtForm.dueDate" type="date" value-format="YYYY-MM-DD" style="width: 100%" /></el-form-item>
          <el-form-item label="备注"><el-input v-model="debtForm.remark" /></el-form-item>
          <div style="text-align:right">
            <el-button size="small" @click="debtFormVisible = false">取消</el-button>
            <el-button size="small" type="primary" @click="onDebtSubmit">保存</el-button>
          </div>
        </el-form>
      </div>
      <template #footer>
        <el-button @click="debtDialog = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 分期明细 -->
    <el-dialog v-model="instDialog" :title="`分期明细 · ${instDebt?.name || ''}`" width="560px">
      <el-table :data="installments" border size="small" max-height="420">
        <el-table-column label="期" width="55"><template #default="{ row }">{{ row.period }}</template></el-table-column>
        <el-table-column prop="dueDate" label="到期" width="115" />
        <el-table-column label="本金" width="90"><template #default="{ row }">{{ Number(row.principal).toFixed(2) }}</template></el-table-column>
        <el-table-column label="利息" width="90"><template #default="{ row }">{{ Number(row.interest).toFixed(2) }}</template></el-table-column>
        <el-table-column label="应还" width="95"><template #default="{ row }">{{ Number(row.amount).toFixed(2) }}</template></el-table-column>
        <el-table-column label="状态/操作" min-width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="INST_TAG[row.status]">{{ INST_STATUS[row.status] }}</el-tag>
            <el-button v-if="row.status !== 1" link type="success" size="small" @click="toggleInstallment(row, 1)">还</el-button>
            <el-button v-else link type="info" size="small" @click="toggleInstallment(row, 0)">撤</el-button>
            <el-button v-if="row.status !== 2" link type="danger" size="small" @click="toggleInstallment(row, 2)">逾期</el-button>
          </template>
        </el-table-column>
      </el-table>
      <template #footer><el-button @click="instDialog = false">关闭</el-button></template>
    </el-dialog>

    <!-- 划账 -->
    <el-dialog v-model="balDialog" title="划账 / 更新余额" width="380px">
      <p class="bal-tip">把「{{ balTarget?.name }}」的余额校正为真实值：</p>
      <el-input-number v-model="balValue" :precision="2" :step="100" style="width: 100%" />
      <div class="reco-line" style="margin-top:10px">
        <el-upload :show-file-list="false" :auto-upload="false" accept="image/*" :on-change="onRecoBalance">
          <el-button size="small" plain :loading="recognizing">上传余额截图识别</el-button>
        </el-upload>
      </div>
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
.reco-line { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
.clickable :deep(.el-table__row) { cursor: pointer; }
.empty-tip { color: #909399; font-size: 13px; padding: 16px 0; }
.imp-item { border: 1px solid #ebeef5; border-radius: 6px; padding: 10px; margin-bottom: 10px; }
.imp-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
.months { color: #909399; font-size: 12px; }
.months-r { color: #909399; font-size: 11px; text-align: right; }
</style>
