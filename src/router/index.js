import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/LoginView.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layout/MainLayout.vue'),
    redirect: '/home',
    children: [
      {
        path: 'home',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
      },
      {
        path: 'account',
        name: 'account',
        component: () => import('@/views/AccountView.vue'),
      },
      {
        path: 'category',
        name: 'category',
        component: () => import('@/views/CategoryView.vue'),
      },
      {
        path: 'stat',
        name: 'stat',
        component: () => import('@/views/StatView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 全局路由守卫：未登录访问受保护页面时跳转登录
router.beforeEach((to) => {
  const token = localStorage.getItem('awp_token')
  if (!to.meta.public && !token) {
    return { path: '/login' }
  }
  // 已登录再访问登录页则回首页
  if (to.path === '/login' && token) {
    return { path: '/home' }
  }
  return true
})

export default router
