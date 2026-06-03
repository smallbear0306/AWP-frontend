<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeMenu = computed(() => route.path)
const nickname = computed(() => userStore.userInfo?.nickname || '用户')

onMounted(async () => {
  // 刷新后若已登录但无用户信息，补拉一次
  if (userStore.token && !userStore.userInfo) {
    try {
      await userStore.fetchUserInfo()
    } catch {
      // 拦截器会处理 401 跳转
    }
  }
})

function onLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <el-container class="layout">
    <el-header class="header">
      <div class="logo">AWP 记账</div>
      <div class="user-area">
        <span class="nickname">你好，{{ nickname }}</span>
        <el-button link type="primary" @click="onLogout">退出</el-button>
      </div>
    </el-header>
    <el-container>
      <el-aside width="180px" class="aside">
        <el-menu :default-active="activeMenu" router>
          <el-menu-item index="/home">
            <el-icon><List /></el-icon>
            <span>账单</span>
          </el-menu-item>
          <el-menu-item index="/category">
            <el-icon><Collection /></el-icon>
            <span>分类管理</span>
          </el-menu-item>
          <el-menu-item index="/stat">
            <el-icon><PieChart /></el-icon>
            <span>统计</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main class="main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.layout {
  height: 100%;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: #409eff;
  color: #fff;
}
.logo {
  font-size: 18px;
  font-weight: bold;
}
.user-area {
  display: flex;
  align-items: center;
  gap: 12px;
}
.nickname {
  font-size: 14px;
}
.aside {
  background-color: #fff;
  border-right: 1px solid #e6e6e6;
}
.main {
  background-color: #f5f6f8;
}
</style>
