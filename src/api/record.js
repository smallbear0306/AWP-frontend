import request from './request'

/** 账单分页查询。params: { page, size, type, categoryId, startDate, endDate } */
export function pageRecord(params) {
  return request.get('/record', { params })
}

export function createRecord(data) {
  return request.post('/record', data)
}

export function updateRecord(id, data) {
  return request.put(`/record/${id}`, data)
}

export function deleteRecord(id) {
  return request.delete(`/record/${id}`)
}
