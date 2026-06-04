import request from './request'

/** 账户列表（含余额/负债/存额） */
export function listAccount() {
  return request.get('/account')
}

export function createAccount(data) {
  return request.post('/account', data)
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
