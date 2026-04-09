<template>
  <div class="min-h-screen flex items-center justify-center gradient-bg-dark relative overflow-hidden">
    <!-- 动态背景 -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
      <div class="absolute -top-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl float-animation"></div>
      <div class="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl float-animation" style="animation-delay: -2s;"></div>
    </div>

    <div class="relative z-10 w-full max-w-md mx-4">
      <div class="glass rounded-2xl p-8 shadow-2xl">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-blue-500 shadow-lg mb-4">
            <n-icon size="32" color="#fff"><PersonAddOutline /></n-icon>
          </div>
          <h1 class="text-2xl font-bold text-white">创建账号</h1>
          <p class="text-gray-400 mt-2 text-sm">注册你的 CloudMail Pro 邮箱</p>
        </div>

        <n-form ref="formRef" :model="form" :rules="rules" size="large">
          <n-form-item path="email" label="邮箱" :label-style="{ color: '#94a3b8' }">
            <n-input v-model:value="form.email" placeholder="your@email.com" class="dark-input">
              <template #prefix><n-icon :size="18" class="text-gray-400"><MailOutlined /></n-icon></template>
            </n-input>
          </n-form-item>

          <n-form-item path="username" label="用户名" :label-style="{ color: '#94a3b8' }">
            <n-input v-model:value="form.username" placeholder="选择一个用户名">
              <template #prefix><n-icon :size="18" class="text-gray-400"><PersonOutline /></n-icon></template>
            </n-input>
          </n-form-item>

          <n-form-item path="password" label="密码" :label-style="{ color: '#94a3b8' }">
            <n-input v-model:value="form.password" type="password" show-password-on="click" placeholder="至少8位">
              <template #prefix><n-icon :size="18" class="text-gray-400"><LockClosedOutline /></n-icon></template>
            </n-input>
          </n-form-item>

          <n-form-item path="confirmPassword" label="确认密码" :label-style="{ color: '#94a3b8' }">
            <n-input v-model:value="form.confirmPassword" type="password" show-password-on="click" placeholder="再次输入密码" @keyup.enter="handleRegister">
              <template #prefix><n-icon :size="18" class="text-gray-400"><LockClosedOutline /></n-icon></template>
            </n-input>
          </n-form-item>

          <n-button type="primary" block round size="large" :loading="loading" @click="handleRegister" class="register-button">
            注 册
          </n-button>
        </n-form>

        <div class="mt-6 text-center">
          <span class="text-gray-400 text-sm">已有账号？</span>
          <router-link :to="{ name: 'Login' }" class="text-blue-400 hover:text-blue-300 text-sm ml-1 transition">
            立即登录
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NForm, NFormItem, NInput, NButton, NIcon, useMessage } from 'naive-ui'
import { MailOutlined, PersonOutline, LockClosedOutline, PersonAddOutline } from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const message = useMessage()
const authStore = useAuthStore()

const formRef = ref()
const loading = ref(false)
const form = ref({ email: '', username: '', password: '', confirmPassword: '' })

const rules = {
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }, { type: 'email' as const, message: '邮箱格式不正确', trigger: 'blur' }],
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }, { min: 3, max: 20, message: '用户名长度3-20位', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 8, message: '密码至少8位', trigger: 'blur' }],
  confirmPassword: [{ required: true, message: '请确认密码', trigger: 'blur' }, {
    validator: (_rule: any, value: string) => value === form.value.password, message: '两次密码不一致', trigger: 'blur'
  }],
}

async function handleRegister() {
  try { await formRef.value?.validate() } catch { return }
  loading.value = true
  try {
    await authStore.register(form.value.email, form.value.username, form.value.password, form.value.confirmPassword)
    message.success('注册成功 🎉')
    router.push('/')
  } catch (err: any) { message.error(err.message || '注册失败') }
  finally { loading.value = false }
}
</script>

<style scoped>
.dark-input :deep(.n-input__input-el) { color: #e2e8f0; }
.dark-input :deep(.n-input__border) { border-color: rgba(255, 255, 255, 0.1); }
.register-button {
  height: 48px !important; font-size: 16px !important; font-weight: 600 !important;
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%) !important; border: none !important;
}
</style>