import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authApi } from '@/api'

interface UserInfo {
  id: string
  email: string
  username: string
  nickname: string | null
  avatar: string | null
  role: 'user' | 'admin' | 'super_admin'
  language: string
  theme: string
  createdAt: number
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const refreshToken = ref<string>(localStorage.getItem('refreshToken') || '')
  const user = ref<UserInfo | null>(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin' || user.value?.role === 'super_admin')
  const isSuperAdmin = computed(() => user.value?.role === 'super_admin')

  async function login(email: string, password: string, turnstileToken?: string) {
    loading.value = true
    try {
      const res: any = await authApi.login({ email, password, turnstileToken })
      token.value = res.data.token
      refreshToken.value = res.data.refreshToken
      user.value = res.data.user
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      return res
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, username: string, password: string, confirmPassword: string, turnstileToken?: string) {
    loading.value = true
    try {
      const res: any = await authApi.register({ email, username, password, confirmPassword, turnstileToken })
      token.value = res.data.token
      refreshToken.value = res.data.refreshToken
      user.value = res.data.user
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('refreshToken', res.data.refreshToken)
      return res
    } finally {
      loading.value = false
    }
  }

  async function fetchUser() {
    try {
      const res: any = await authApi.getMe()
      user.value = res.data
    } catch {
      logout()
    }
  }

  function logout() {
    token.value = ''
    refreshToken.value = ''
    user.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }

  return {
    token,
    refreshToken,
    user,
    loading,
    isAuthenticated,
    isAdmin,
    isSuperAdmin,
    login,
    register,
    fetchUser,
    logout,
  }
}, {
  persist: {
    pick: ['token', 'refreshToken'],
  },
})