<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { pageRecord } from '@/api/record'
import { listAccount, listDebt } from '@/api/account'

const route = useRoute()
const router = useRouter()
const accountId = Number(route.params.id)

const DEBT_STATUS = { 0: '未还款', 1: '已还款', 2: '已逾期' }
const STATUS_TAG = { 0: 'warning', 1: 'success', 2: 'danger' }

const account = ref(null)
const debts = ref([])
const list = ref([])
const total = ref(0)
const loading = ref(false)

const query = reactive({ page: 1, size: 10, accountId, type: null, sort: 'date', startDate: null, endDate: null })
const dateRange = ref([])

const netClass = computed(() => (account.value && Number(account.value.netAmount) < 0 ? 'neg' : ''))

async function loadAccount() {
  const all = await listAccount()
  account.value = all.find((a) => a.id === accountId) || null
}
async function loadDebts() { debts.value = await listDebt(accountId) }
async function loadRecords() {
  loading.value = true
  try {
    if (dateRange.value && dateRange.value.length === 2) {
      query.startDate = dateRange.value[0]; query.endDate = dateRange.value[1]
    } else { query.startDate = null; query.endDate = null }
    const data = await pageRecord(query)
    list.value = data.list; total.value = data.total
  } finally { loading.value = false }
}
function onSearch() { query.page = 1; loadRecords() }

onMounted(() => { loadAccount(); loadDebts(); loadRecords() })
</script>

<template>
  <div v-loading="loading">
    <el-page-header content="账户详情" @back="router.push('/account')" class="ph" />

    <!-- 账户概览 -->
    <el-card v-if="account" class="hd">
      <div class="hd-name">{{ account.name }}
        <el-tag size="small" :type="account.kind === 1 ? 'warning' : 'info'">{{ account.kind === 1 ? '信用' : '储蓄' }}</el-tag>
        <span class="hd-sub">{{ account.type }}<span v-if="account.bank"> · {{ account.bank }}</span></span>
      </div>
      <el-row :gutter="16" class="hd-nums">
        <el-col :span="8"><div class="lbl">余额</div><div class="num">{{ Number(account.balance).toFixed(2) }}</div></el-col>
        <el-col :span="8"><div class="lbl">负债</div><div class="num debt">{{ Number(account.debtTotal || 0).toFixed(2) }}</div></el-col>
        <el-col :span="8"><div class="lbl">存额</div><div class="num" :class="netClass">{{ Number(account.netAmount).toFixed(2) }}</div></el-col>
      </el-row>
    </el-card>

    <!-- 负债 -->
    <el-card class="sec">
      <div class="sec-title">负债</div>
      <el-table :data="debts" border size="small" empty-text="无负债">
        <el-table-column prop="name" label="说明" min-width="110" />
        <el-table-column label="总额(本息)" min-width="130">
          <template #default="{ row }">
            {{ Number(row.total).toFixed(2) }}
            <div class="muted-r">含息 {{ Number(row.interestTotal || 0).toFixed(2) }}</div>
          </template>
        </el-table-column>
        <el-table-column label="方式" width="130">
          <template #default="{ row }">{{ row.type === 1 ? '按月还款' : '一次性' }}<span v-if="row.rate" class="muted"> · {{ Number(row.rate) }}%</span></template>
        </el-table-column>
        <el-table-column label="进度" width="100"><template #default="{ row }">{{ row.paidPeriods }}/{{ row.periods }} 期</template></el-table-column>
        <el-table-column label="未结清" width="110"><template #default="{ row }"><span style="color:#f56c6c">{{ Number(row.outstanding).toFixed(2) }}</span></template></el-table-column>
        <el-table-column prop="dueDate" label="首期" width="110" />
      </el-table>
    </el-card>

    <!-- 余额变动记录（该账户账单流水） -->
    <el-card class="sec">
      <div class="sec-title">余额变动记录</div>
      <div class="filter-bar">
        <el-radio-group v-model="query.type" @change="onSearch">
          <el-radio-button :value="null">收入+支出</el-radio-button>
          <el-radio-button :value="1">只看收入</el-radio-button>
          <el-radio-button :value="0">只看支出</el-radio-button>
        </el-radio-group>
        <el-radio-group v-model="query.sort" @change="onSearch">
          <el-radio-button value="date">时间近→远</el-radio-button>
          <el-radio-button value="amount">金额高→低</el-radio-button>
        </el-radio-group>
        <el-date-picker v-model="dateRange" type="daterange" range-separator="至"
          start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 230px"
          @change="onSearch" clearable />
        <el-button type="primary" @click="onSearch">查询</el-button>
      </div>
      <el-table :data="list" border stripe size="small" empty-text="暂无记录">
        <el-table-column prop="recordDate" label="日期" width="115" />
        <el-table-column label="分类" min-width="150">
          <template #default="{ row }">{{ row.parentCategoryName }} / {{ row.categoryName }}</template>
        </el-table-column>
        <el-table-column label="变动" width="120">
          <template #default="{ row }">
            <span :style="{ color: row.type === 1 ? '#67c23a' : '#f56c6c' }">
              {{ row.type === 1 ? '+' : '-' }}{{ Number(row.amount).toFixed(2) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" show-overflow-tooltip />
      </el-table>
      <el-pagination class="pager" layout="total, prev, pager, next" :total="total"
        :page-size="query.size" :current-page="query.page" @current-change="(p) => { query.page = p; loadRecords() }" />
    </el-card>
  </div>
</template>

<style scoped>
.ph { margin-bottom: 14px; }
.hd { margin-bottom: 14px; }
.hd-name { font-size: 18px; font-weight: bold; display: flex; align-items: center; gap: 8px; }
.hd-sub { font-size: 13px; color: #909399; font-weight: normal; }
.hd-nums { margin-top: 14px; text-align: center; }
.lbl { font-size: 13px; color: #909399; }
.num { font-size: 22px; font-weight: bold; margin-top: 4px; }
.num.debt { color: #f56c6c; }
.num.neg { color: #f56c6c; }
.sec { margin-bottom: 14px; }
.sec-title { font-weight: bold; margin-bottom: 12px; }
.filter-bar { display: flex; gap: 10px; margin-bottom: 12px; flex-wrap: wrap; }
.pager { margin-top: 12px; justify-content: flex-end; }
.muted { color: #909399; font-size: 12px; }
.muted-r { color: #909399; font-size: 11px; text-align: right; }
</style>
