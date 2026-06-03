import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '@/router'

// 统一的 axios 实例
const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截：携带 token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('awp_token')
    if (token) {
      config.headers.Authorization = 'Bearer ' + token
    }
    return config
  },
  (error) => Promise.reject(error),
)

// 响应拦截：统一处理 { code, msg, data }
request.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code === 0) {
      return res.data
    }
    // 未登录/登录过期
    if (res.code === 2001) {
      localStorage.removeItem('awp_token')
      router.push('/login')
    }
    ElMessage.error(res.msg || '请求失败')
    return Promise.reject(new Error(res.msg || 'Error'))
  },
  (error) => {
    ElMessage.error(error.message || '网络异常')
    return Promise.reject(error)
  },
)

export default request
