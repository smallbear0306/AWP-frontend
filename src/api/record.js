import request from './request'

/** 账单分页查询。params: { page, size, type, categoryId, startDate, endDate } */
export function pageRecord(params) {
  return request.get('/record', { params })
}

export function createRecord(data) {
  return request.post('/record', data)
}

/** 批量创建（一张截图多笔）。data: { imageBase64, records:[...] } */
export function batchCreateRecord(data) {
  return request.post('/record/batch', data)
}

export function updateRecord(id, data) {
  return request.put(`/record/${id}`, data)
}

export function deleteRecord(id) {
  return request.delete(`/record/${id}`)
}

/** 上传截图识别（multipart），返回多笔预填 + 压缩图 base64。
 * 识别走 3 轮模型调用，较慢，单独放宽超时到 60s。 */
export function recognizeRecord(file) {
  const fd = new FormData()
  fd.append('file', file)
  return request.post('/record/recognize', fd, { timeout: 60000 })
}

/** 取某账单的截图（data URL） */
export function getRecordImage(id) {
  return request.get(`/record/${id}/image`)
}
