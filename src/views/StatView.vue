<script setup>
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from 'vue'
import echarts from '@/utils/echarts'
import { statSummary, statCategory, statTrend } from '@/api/stat'
import { useMobile } from '@/composables/useMobile'

const { isMobile } = useMobile()

const dateRange = ref([])
const summary = reactive({ income: 0, expense: 0, balance: 0 })
const pieType = ref(0) // 0 支出 / 1 收入

const pieRef = ref()
const lineRef = ref()
let pieChart = null
let lineChart = null

function rangeParams() {
  if (dateRange.value && dateRange.value.length === 2) {
    return { startDate: dateRange.value[0], endDate: dateRange.value[1] }
  }
  return {}
}

async function loadSummary() {
  const data = await statSummary(rangeParams())
  summary.income = Number(data.income)
  summary.expense = Number(data.expense)
  summary.balance = Number(data.balance)
}

async function loadPie() {
  const data = await statCategory({ ...rangeParams(), type: pieType.value })
  const seriesData = data.map((d) => ({ name: d.categoryName || '未分类', value: Number(d.amount) }))
  pieChart.setOption({
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [
      {
        name: pieType.value === 1 ? '收入' : '支出',
        type: 'pie',
        radius: ['40%', '65%'],
        data: seriesData,
        emptyCircleStyle: { color: '#f0f0f0' },
      },
    ],
  })
}

async function loadLine() {
  const data = await statTrend(rangeParams())
  const months = data.map((d) => d.month)
  lineChart.setOption({
    tooltip: { trigger: 'axis' },
    legend: { data: ['收入', '支出'], bottom: 0 },
    xAxis: { type: 'category', data: months },
    yAxis: { type: 'value' },
    series: [
      { name: '收入', type: 'line', smooth: true, data: data.map((d) => Number(d.income)) },
      { name: '支出', type: 'line', smooth: true, data: data.map((d) => Number(d.expense)) },
    ],
  })
}

async function loadAll() {
  await Promise.all([loadSummary(), loadPie(), loadLine()])
}

function onResize() {
  pieChart?.resize()
  lineChart?.resize()
}

onMounted(async () => {
  await nextTick()
  pieChart = echarts.init(pieRef.value)
  lineChart = echarts.init(lineRef.value)
  window.addEventListener('resize', onResize)
  await loadAll()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  pieChart?.dispose()
  lineChart?.dispose()
})
</script>

<template>
  <div class="stat">
    <el-card class="filter-card">
      <span class="label">日期范围：</span>
      <el-date-picker
        v-model="dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        value-format="YYYY-MM-DD"
        style="width: 240px"
      />
      <el-button type="primary" @click="loadAll">查询</el-button>
    </el-card>

    <!-- 汇总卡片：移动端紧凑一行三栏，桌面端三卡 -->
    <div v-if="isMobile" class="sum-mobile">
      <div class="sm-cell"><div class="sum-label">收入</div><div class="sum-val income">{{ summary.income.toFixed(2) }}</div></div>
      <div class="sm-cell"><div class="sum-label">支出</div><div class="sum-val expense">{{ summary.expense.toFixed(2) }}</div></div>
      <div class="sm-cell"><div class="sum-label">结余</div><div class="sum-val">{{ summary.balance.toFixed(2) }}</div></div>
    </div>
    <el-row v-else :gutter="16" class="summary-row">
      <el-col :span="8"><el-card><div class="sum-label">收入</div><div class="sum-val income">{{ summary.income.toFixed(2) }}</div></el-card></el-col>
      <el-col :span="8"><el-card><div class="sum-label">支出</div><div class="sum-val expense">{{ summary.expense.toFixed(2) }}</div></el-card></el-col>
      <el-col :span="8"><el-card><div class="sum-label">结余</div><div class="sum-val">{{ summary.balance.toFixed(2) }}</div></el-card></el-col>
    </el-row>

    <el-row :gutter="16">
      <el-col :span="isMobile ? 24 : 12">
        <el-card class="chart-card">
          <div class="chart-header">
            <span>分类占比</span>
            <el-radio-group v-model="pieType" size="small" @change="loadPie">
              <el-radio-button :value="0">支出</el-radio-button>
              <el-radio-button :value="1">收入</el-radio-button>
            </el-radio-group>
          </div>
          <div ref="pieRef" class="chart"></div>
        </el-card>
      </el-col>
      <el-col :span="isMobile ? 24 : 12">
        <el-card class="chart-card">
          <div class="chart-header"><span>收支趋势（按月）</span></div>
          <div ref="lineRef" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
.label {
  font-size: 14px;
  color: #606266;
  margin-right: 8px;
}
.filter-card {
  margin-bottom: 16px;
}
.filter-card :deep(.el-button) {
  margin-left: 12px;
}
.summary-row {
  margin-bottom: 16px;
}
.sum-label {
  font-size: 14px;
  color: #909399;
}
.sum-val {
  font-size: 26px;
  font-weight: bold;
  margin-top: 8px;
}
.sum-val.income {
  color: #67c23a;
}
.sum-val.expense {
  color: #f56c6c;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: bold;
}
.chart {
  height: 320px;
}
/* 移动端汇总：白卡内三等分 */
.sum-mobile {
  display: flex; background: #fff; border-radius: 10px;
  padding: 14px 0; margin-bottom: 14px;
}
.sm-cell { flex: 1; text-align: center; }
.sm-cell .sum-val { font-size: 18px; margin-top: 4px; }
.chart-card { margin-bottom: 14px; }
</style>
