<template>
  <div class="min-h-screen flex items-center justify-center gradient-bg-dark relative overflow-hidden">
    <!-- 动态背景装饰 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl float-animation"></div>
      <div class="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-animation" style="animation-delay: -3s;"></div>
      <div class="absolute top-1/3 left-1/3 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl float-animation" style="animation-delay: -1.5s;"></div>
    </div>

    <!-- 登录卡片 -->
    <div class="relative z-10 w-full max-w-md mx-4">
      <div class="glass rounded-2xl p-8 shadow-2xl">
        <!-- Logo -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/25 mb-4">
            <n-icon size="32" color="#fff"><MailOutlined /></n-icon>
          </div>
          <h1 class="text-2xl font-bold text-white">CloudMail Pro</h1>
          <p class="text-gray-400 mt-2 text-sm">基于 Cloudflare 的邮件服务平台</p>
        </div>

        <!-- 登录表单 -->
        <n-form ref="formRef" :model="form" :rules="rules" size="large">
          <n-form-item path="email" label="邮箱" :label-style="{ color: '#94a3b8' }">
            <n-input
              v-model:value="form.email"
              placeholder="请输入邮箱地址"
              :input-props="{ autocomplete: 'email' }"
              class="dark-input"
            >
              <template #prefix><n-icon :size="18" class="text-gray-400"><MailOutlined /></n-icon></template>
            </n-input>
          </n-form-item>

          <n-form-item path="password" label="密码" :label-style="{ color: '#94a3b8' }">
            <n-input
              v-model:value="form.password"
              type="password"
              show-password-on="click"
              placeholder="请输入密码"
              :input-props="{ autocomplete: 'current-password' }"
              @keyup.enter="handleLogin"
            >
              <template #prefix><n-icon :size="18" class="text-gray-400"><LockClosedOutline /></n-icon></template>
            </n-input>
          </n-form-item>

          <!-- Turnstile 人机验证 (如果启用) -->
          <div v-if="turnstileSiteKey" class="mb-4 flex justify-center">
            <div id="turnstile-container"></div>
          </div>

          <n-button
            type="primary"
            block
            round
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="login-button"
          >
            登 录
          </n-button>
        </n-form>

        <!-- 注册链接 -->
        <div class="mt-6 text-center">
          <span class="text-gray-400 text-sm">还没有账号？</span>
          <router-link :to="{ name: 'Register' }" class="text-blue-400 hover:text-blue-300 text-sm ml-1 transition">
            立即注册
          </router-link>
        </div>
      </div>

      <!-- 底部信息 -->
      <div class="text-center mt-6 text-gray-500 text-xs">
        Powered by Cloudflare Workers · D1 · R2
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NForm, NFormItem, NInput, NButton, NIcon, useMessage } from 'naive-ui'
import { MailOutlined, LockClosedOutline } from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const authStore = useAuthStore()

const formRef = ref()
const loading = ref(false)
const turnstileSiteKey = ref('')
const turnstileToken = ref('')
const form = ref({
  email: '',
  password: '',
})

const rules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email' as const, message: '邮箱格式不正确', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
  ],
}

async function handleLogin() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  loading.value = true
  try {
    await authStore.login(form.value.email, form.value.password, turnstileToken.value || undefined)
    message.success('登录成功 🎉')
    const redirect = (route.query.redirect as string) || '/'
    router.push(redirect)
  } catch (err: any) {
    message.error(err.message || '登录失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 获取公开设置（Turnstile Site Key）
  try {
    const res = await fetch('/api/settings/public')
    const data = await res.json()
    if (data?.data?.turnstileSiteKey) {
      turnstileSiteKey.value = data.data.turnstileSiteKey
    }
  } catch {}
})
</script>

<style scoped>
.dark-input :deep(.n-input__input-el),
.dark-input :deep(.n-input__textarea-el) {
  color: #e2e8f0;
}

.dark-input :deep(.n-input__border),
.dark-input :deep(.n-input__state-border) {
  border-color: rgba(255, 255, 255, 0.1);
}

.dark-input :deep(.n-input__border:hover),
.dark-input :deep(.n-input__state-border:hover) {
  border-color: rgba(255, 255, 255, 0.2);
}

.login-button {
  height: 48px !important;
  font-size: 16px !important;
  font-weight: 600 !important;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%) !important;
  border: none !important;
  transition: all 0.3s ease !important;
}

.login-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.35) !important;
}
</style>