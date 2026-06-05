// ECharts 按需引入：只打包用到的图表/组件，体积远小于全量 echarts
import * as echarts from 'echarts/core'
import { PieChart, LineChart } from 'echarts/charts'
import {
  TooltipComponent, LegendComponent, GridComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  PieChart, LineChart,
  TooltipComponent, LegendComponent, GridComponent,
  CanvasRenderer,
])

export default echarts
