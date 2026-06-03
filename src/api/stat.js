import request from './request'

/** 收支汇总。params: { startDate, endDate } */
export function statSummary(params) {
  return request.get('/stat/summary', { params })
}

/** 分类占比。params: { type, startDate, endDate } */
export function statCategory(params) {
  return request.get('/stat/category', { params })
}

/** 收支趋势（按月）。params: { startDate, endDate } */
export function statTrend(params) {
  return request.get('/stat/trend', { params })
}
