import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { requiresAuth: false, title: '登录' },
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/pages/auth/RegisterPage.vue'),
    meta: { requiresAuth: false, title: '注册' },
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Inbox',
        component: () => import('@/pages/mail/InboxPage.vue'),
        meta: { title: '收件箱', icon: 'mail-outline' },
      },
      {
        path: 'sent',
        name: 'Sent',
        component: () => import('@/pages/mail/SentPage.vue'),
        meta: { title: '已发送', icon: 'send-outline' },
      },
      {
        path: 'starred',
        name: 'Starred',
        component: () => import('@/pages/mail/StarredPage.vue'),
        meta: { title: '星标邮件', icon: 'star-outline' },
      },
      {
        path: 'compose',
        name: 'Compose',
        component: () => import('@/pages/mail/ComposePage.vue'),
        meta: { title: '写邮件', icon: 'create-outline' },
      },
      {
        path: 'mail/:id',
        name: 'MailDetail',
        component: () => import('@/pages/mail/MailDetailPage.vue'),
        meta: { title: '邮件详情' },
      },
      {
        path: 'addresses',
        name: 'Addresses',
        component: () => import('@/pages/mail/AddressesPage.vue'),
        meta: { title: '邮箱地址', icon: 'at-outline' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/pages/user/SettingsPage.vue'),
        meta: { title: '设置', icon: 'settings-outline' },
      },
    ],
  },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        name: 'AdminDashboard',
        component: () => import('@/pages/admin/DashboardPage.vue'),
        meta: { title: '仪表盘' },
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('@/pages/admin/UsersPage.vue'),
        meta: { title: '用户管理' },
      },
      {
        path: 'mails',
        name: 'AdminMails',
        component: () => import('@/pages/admin/MailsPage.vue'),
        meta: { title: '邮件管理' },
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('@/pages/admin/SystemSettingsPage.vue'),
        meta: { title: '系统设置' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - CloudMail Pro` : 'CloudMail Pro'
  
  if (to.meta.requiresAuth && !token) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
  } else if ((to.name === 'Login' || to.name === 'Register') && token) {
    next({ name: 'Inbox' })
  } else {
    next()
  }
})

export default router