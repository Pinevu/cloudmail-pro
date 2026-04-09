import axios from 'axios'
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'

// ============ 创建 Axios 实例 ============
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ============ 请求拦截器 ============
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ============ 响应拦截器 ============
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const data = response.data
    if (data.code && data.code !== 200) {
      return Promise.reject(new Error(data.message || '请求失败'))
    }
    return data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      if (status === 401) {
        // Token 过期，跳转登录
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        router.push({ name: 'Login', query: { redirect: router.currentRoute.value.fullPath } })
      }
      return Promise.reject(new Error(data?.message || `请求错误 (${status})`))
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，请稍后重试'))
    }
    return Promise.reject(new Error('网络错误，请检查网络连接'))
  }
)

// ============ API 接口定义 ============

// -- 认证 --
export const authApi = {
  login: (data: { email: string; password: string; turnstileToken?: string }) =>
    api.post('/auth/login', data),
  register: (data: { email: string; username: string; password: string; confirmPassword: string; turnstileToken?: string }) =>
    api.post('/auth/register', data),
  refreshToken: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me'),
}

// -- 邮件 --
export const mailApi = {
  list: (params?: Record<string, any>) => api.get('/mail/list', { params }),
  getDetail: (id: string) => api.get(`/mail/${id}`),
  send: (data: {
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    content: string
    contentType?: 'plain' | 'html'
    fromAddressId?: string
    attachmentIds?: string[]
  }) => api.post('/mail/send', data),
  star: (id: string, starred: boolean) => api.patch(`/mail/${id}/star`, { starred }),
  read: (id: string, read: boolean) => api.patch(`/mail/${id}/read`, { read }),
  delete: (id: string) => api.delete(`/mail/${id}`),
  batchRead: (ids: string[]) => api.post('/mail/batch/read', { ids }),
  batchDelete: (ids: string[]) => api.post('/mail/batch/delete', { ids }),
}

// -- 邮箱地址 --
export const addressApi = {
  list: () => api.get('/mail/addresses'),
  create: (data: { address: string; alias?: string; isDefault?: boolean; forwardingTo?: string; telegramNotify?: boolean }) =>
    api.post('/mail/addresses', data),
  delete: (id: string) => api.delete(`/mail/addresses/${id}`),
}

// -- 用户 --
export const userApi = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data: { nickname?: string; avatar?: string; language?: string; theme?: string }) =>
    api.patch('/user/profile', data),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/user/change-password', data),
  bindTelegram: (chatId: string) => api.post('/user/telegram/bind', { chatId }),
  unbindTelegram: () => api.post('/user/telegram/unbind'),
  createApiToken: (data: { name: string; permissions?: string[] }) => api.post('/user/api-tokens', data),
  listApiTokens: () => api.get('/user/api-tokens'),
}

// -- 管理员 --
export const adminApi = {
  getStats: () => api.get('/admin/stats'),
  listUsers: (params?: Record<string, any>) => api.get('/admin/users', { params }),
  updateUserStatus: (id: string, status: string) => api.patch(`/admin/users/${id}/status`, { status }),
  updateUserRole: (id: string, role: string) => api.patch(`/admin/users/${id}/role`, { role }),
  updateUserQuota: (id: string, data: { quotaEmail?: number; quotaAttachments?: number }) =>
    api.patch(`/admin/users/${id}/quota`, data),
  listMails: (params?: Record<string, any>) => api.get('/admin/mails', { params }),
  deleteMail: (id: string) => api.delete(`/admin/mails/${id}`),
  batchCreateUsers: (users: Array<{ email: string; username: string; password: string; role?: string }>) =>
    api.post('/admin/users/batch', { users }),
}

// -- 设置 --
export const settingsApi = {
  getPublic: () => api.get('/settings/public'),
  getAll: () => api.get('/settings/all'),
  update: (data: Record<string, string>) => api.put('/settings', data),
}

export default api