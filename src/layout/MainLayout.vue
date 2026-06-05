<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { useMobile } from '@/composables/useMobile'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const { isMobile } = useMobile()

const activeMenu = computed(() => route.path)
const nickname = computed(() => userStore.userInfo?.nickname || '用户')

function isActive(path) {
  return route.path === path || (path === '/home' && route.path === '/')
}
function go(path) { if (!isActive(path)) router.push(path) }
// 中间加号 = 手动记一笔：跳到账单页并通过 query 触发其弹窗
function addRecord() { router.push({ path: '/home', query: { add: String(Date.now()) } }) }

onMounted(async () => {
  if (userStore.token && !userStore.userInfo) {
    try { await userStore.fetchUserInfo() } catch { /* 拦截器处理401 */ }
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
        <el-button link style="color:#fff" @click="onLogout">退出</el-button>
      </div>
    </el-header>

    <el-container>
      <!-- 桌面端：固定侧边栏 -->
      <el-aside v-if="!isMobile" width="180px" class="aside">
        <el-menu :default-active="activeMenu" router>
          <el-menu-item index="/home"><el-icon><List /></el-icon><span>账单</span></el-menu-item>
          <el-menu-item index="/account"><el-icon><Wallet /></el-icon><span>账户</span></el-menu-item>
          <el-menu-item index="/category"><el-icon><Collection /></el-icon><span>分类管理</span></el-menu-item>
          <el-menu-item index="/stat"><el-icon><PieChart /></el-icon><span>统计</span></el-menu-item>
        </el-menu>
      </el-aside>

      <el-main class="main" :class="{ 'main-mobile': isMobile }">
        <router-view />
      </el-main>
    </el-container>

    <!-- 移动端：底部 Tab 栏 + 中间加号 -->
    <nav v-if="isMobile" class="tabbar">
      <div class="tab" :class="{ on: isActive('/home') }" @click="go('/home')">
        <el-icon><Tickets /></el-icon><span>账单</span>
      </div>
      <div class="tab" :class="{ on: isActive('/account') }" @click="go('/account')">
        <el-icon><Wallet /></el-icon><span>账户</span>
      </div>
      <div class="tab-add" @click="addRecord"><el-icon><Plus /></el-icon></div>
      <div class="tab" :class="{ on: isActive('/stat') }" @click="go('/stat')">
        <el-icon><PieChart /></el-icon><span>统计</span>
      </div>
      <div class="tab" :class="{ on: isActive('/category') }" @click="go('/category')">
        <el-icon><Collection /></el-icon><span>分类</span>
      </div>
    </nav>
  </el-container>
</template>

<style scoped>
.layout { height: 100%; }
.header {
  display: flex; align-items: center; justify-content: space-between;
  background-color: #409eff; color: #fff;
}
.logo { font-size: 18px; font-weight: bold; }
.user-area { display: flex; align-items: center; gap: 12px; }
.nickname { font-size: 14px; }
.aside { background-color: #fff; border-right: 1px solid #e6e6e6; }
.main { background-color: #f5f6f8; }
.main-mobile { padding: 12px 12px 76px; }

/* 底部 Tab 栏 */
.tabbar {
  position: fixed; left: 0; right: 0; bottom: 0; height: 58px;
  background: #fff; border-top: 1px solid #ebeef5;
  display: flex; align-items: center; justify-content: space-around;
  z-index: 1000; padding-bottom: env(safe-area-inset-bottom, 0);
}
.tab {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px;
  font-size: 11px; color: #909399; cursor: pointer;
}
.tab .el-icon { font-size: 20px; }
.tab.on { color: #409eff; }
.tab-add {
  width: 52px; height: 52px; border-radius: 50%;
  background: #409eff; color: #fff;
  display: flex; align-items: center; justify-content: center;
  margin-top: -22px; box-shadow: 0 4px 10px rgba(64,158,255,.4);
  flex-shrink: 0; cursor: pointer;
}
.tab-add .el-icon { font-size: 26px; }
</style>
