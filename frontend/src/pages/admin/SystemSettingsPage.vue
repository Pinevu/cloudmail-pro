<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-gray-800 dark:text-white">系统设置</h2>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <n-card title="网站设置" :bordered="false" class="shadow-sm">
        <n-form :model="settingsForm" label-placement="left" label-width="100">
          <n-form-item label="网站标题"><n-input v-model:value="settingsForm.site_title" round /></n-form-item>
          <n-form-item label="允许注册"><n-switch v-model:value="settingsForm.enable_registration_bool" /></n-form-item>
          <n-form-item label="Turnstile"><n-switch v-model:value="settingsForm.enable_turnstile_bool" /></n-form-item>
          <n-form-item label="每用户地址数"><n-input-number v-model:value="settingsForm.max_addresses_per_user" :min="1" :max="20" /></n-form-item>
          <n-form-item label="每日邮件数"><n-input-number v-model:value="settingsForm.max_quota_per_day" :min="10" :max="1000" /></n-form-item>
          <n-button type="primary" round :loading="saving" @click="saveSettings">保存设置</n-button>
        </n-form>
      </n-card>
      <n-card title="登录背景" :bordered="false" class="shadow-sm">
        <n-form-item label="背景图片"><n-input v-model:value="settingsForm.login_bg" placeholder="图片 URL" round /></n-form-item>
        <n-form-item label="透明度"><n-slider v-model:value="settingsForm.login_bg_opacity_num" :min="0" :max="1" :step="0.1" /></n-form-item>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NCard, NForm, NFormItem, NInput, NInputNumber, NSwitch, NSlider, NButton, useMessage } from 'naive-ui'
import { settingsApi } from '@/api'
const message = useMessage()
const settingsForm = ref({ site_title: '', enable_registration_bool: true, enable_turnstile_bool: true, max_addresses_per_user: 5, max_quota_per_day: 100, login_bg: '', login_bg_opacity_num: 0.3 })
const saving = ref(false)

async function loadSettings() {
  try { const res: any = await settingsApi.getAll(); const data = res.data || {}; settingsForm.value = { ...settingsForm.value, ...data, enable_registration_bool: data.enable_registration !== 'false', enable_turnstile_bool: data.enable_turnstile !== 'false', login_bg_opacity_num: parseFloat(data.login_bg_opacity) || 0.3 } } catch {}
}
async function saveSettings() {
  saving.value = true
  try {
    const data: Record<string, string> = {
      site_title: settingsForm.value.site_title,
      enable_registration: settingsForm.value.enable_registration_bool ? 'true' : 'false',
      enable_turnstile: settingsForm.value.enable_turnstile_bool ? 'true' : 'false',
      max_addresses_per_user: String(settingsForm.value.max_addresses_per_user),
      max_quota_per_day: String(settingsForm.value.max_quota_per_day),
      login_bg: settingsForm.value.login_bg,
      login_bg_opacity: String(settingsForm.value.login_bg_opacity_num),
    }
    await settingsApi.update(data); message.success('保存成功')
  } catch (err: any) { message.error(err.message) } finally { saving.value = false }
}
onMounted(() => loadSettings())
</script>