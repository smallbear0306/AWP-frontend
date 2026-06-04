import request from './request'

/** 账户列表（含余额/负债/存额） */
export function listAccount() {
  return request.get('/account')
}

export function createAccount(data) {
  return request.post('/account', data)
}

/** 批量创建账户。data: { accounts:[...] } */
export function batchCreateAccount(data) {
  return request.post('/account/batch', data)
}

export function updateAccount(id, data) {
  return request.put(`/account/${id}`, data)
}

export function deleteAccount(id) {
  return request.delete(`/account/${id}`)
}

/** 划账/更新：直接设置余额 */
export function setAccountBalance(id, balance) {
  return request.put(`/account/${id}/balance`, { balance })
}

/** 截图识别账户类型/余额（multipart，识别较慢放宽超时） */
export function recognizeAccount(file) {
  const fd = new FormData()
  fd.append('file', file)
  return request.post('/account/recognize', fd, { timeout: 60000 })
}

/** 某账户的负债列表 */
export function listDebt(accountId) {
  return request.get('/debt', { params: { accountId } })
}
export function createDebt(data) {
  return request.post('/debt', data)
}
export function updateDebt(id, data) {
  return request.put(`/debt/${id}`, data)
}
export function deleteDebt(id) {
  return request.delete(`/debt/${id}`)
}
/** 某负债的分期明细 */
export function listInstallments(debtId) {
  return request.get(`/debt/${debtId}/installments`)
}
/** 标记某一期状态 0未还/1已还/2逾期 */
export function setInstallmentStatus(id, status) {
  return request.put(`/debt/installment/${id}`, { status })
}
