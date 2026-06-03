import { defineStore } from 'pinia'
import { ref } from 'vue'
import { login as loginApi, getUserInfo } from '@/api/user'

const TOKEN_KEY = 'awp_token'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) || '')
  const userInfo = ref(null)

  /** 登录：保存 token */
  async function login(form) {
    const data = await loginApi(form)
    token.value = data.token
    localStorage.setItem(TOKEN_KEY, data.token)
    userInfo.value = {
      userId: data.userId,
      username: data.username,
      nickname: data.nickname,
    }
    return data
  }

  /** 拉取当前用户信息 */
  async function fetchUserInfo() {
    userInfo.value = await getUserInfo()
    return userInfo.value
  }

  /** 退出登录 */
  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  return { token, userInfo, login, fetchUserInfo, logout }
})
