import request from './request'

/** 注册 */
export function register(data) {
  return request.post('/user/register', data)
}

/** 登录，返回 { token, userId, username, nickname } */
export function login(data) {
  return request.post('/user/login', data)
}

/** 获取当前用户信息 */
export function getUserInfo() {
  return request.get('/user/info')
}
