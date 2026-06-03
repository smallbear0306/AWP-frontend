import request from './request'

/** 分类树（一级带二级 children），type 可选（0 支出 / 1 收入） */
export function getCategoryTree(type) {
  return request.get('/category/tree', { params: { type } })
}

/** 分类扁平列表，type 可选（0 支出 / 1 收入） */
export function listCategory(type) {
  return request.get('/category', { params: { type } })
}

export function createCategory(data) {
  return request.post('/category', data)
}

export function updateCategory(id, data) {
  return request.put(`/category/${id}`, data)
}

export function deleteCategory(id) {
  return request.delete(`/category/${id}`)
}
