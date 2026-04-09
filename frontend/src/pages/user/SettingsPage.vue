<template>
  <div class="space-y-6">
    <h2 class="text-lg font-semibold text-gray-800 dark:text-white">个人设置</h2>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- 基本信息 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
        <h3 class="font-semibold text-gray-800 dark:text-white mb-4">基本信息</h3>
        <n-form :model="profileForm" label-placement="left" label-width="80">
          <n-form-item label="昵称"><n-input v-model:value="profileForm.nickname" placeholder="你的昵称" round /></n-form-item>
          <n-form-item label="语言"><n-select v-model:value="profileForm.language" :options="langOptions" round /></n-form-item>
          <n-form-item label="主题"><n-radio-group v-model:value="profileForm.theme"><n-radio value="light">浅色</n-radio><n-radio value="dark">深色</n-radio></n-radio-group></n-form-item>
          <n-button type="primary" round :loading="saving" @click="saveProfile">保存</n-button>
        </n-form>
      </div>
      <!-- 安全设置 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
        <h3 class="font-semibold text-gray-800 dark:text-white mb-4">安全设置</h3>
        <n-button round @click="showPwdModal = true">修改密码</n-button>
      </div>
      <!-- Telegram 绑定 -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
        <h3 class="font-semibold text-gray-800 dark:text-white mb-4">Telegram 通知</h3>
        <div v-if="!telegramBound" class="text-sm text-gray-500 mb-3">绑定 Telegram 后，收到邮件时会自动推送通知</div>
        <n-input v-model:value="telegramChatId" placeholder="Telegram Chat ID" round />
        <n-button type="primary" round class="mt-3" @click="bindTelegram">{{ telegramBound ? '更新绑定' : '绑定账号' }}</n-button>
      </div>
      <!-- API Token -->
      <div class="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
        <h3 class="font-semibold text-gray-800 dark:text-white mb-4">API Token</h3>
        <n-button round @click="createApiToken">生成新 Token</n-button>
        <div v-if="newToken" class="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg break-all text-xs">{{ newToken }}</div>
      </div>
    </div>
    <!-- 修改密码弹窗 -->
    <n-modal v-model:show="showPwdModal" preset="card" title="修改密码" style="width: 400px">
      <n-form :model="pwdForm" label-placement="left">
        <n-form-item label="旧密码"><n-input v-model:value="pwdForm.oldPassword" type="password" show-password-on="click" round /></n-form-item>
        <n-form-item label="新密码"><n-input v-model:value="pwdForm.newPassword" type="password" show-password-on="click" round /></n-form-item>
      </n-form>
      <template #footer><n-button type="primary" round :loading="pwdSaving" @click="changePassword">确认修改</n-button></template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NIcon, NForm, NFormItem, NInput, NSelect, NRadioGroup, NRadio, NModal, useMessage } from 'naive-ui'
import { userApi } from '@/api'
const message = useMessage()
const profileForm = ref({ nickname: '', language: 'zh-CN', theme: 'light' })
const pwdForm = ref({ oldPassword: '', newPassword: '' })
const saving = ref(false); const pwdSaving = ref(false); const showPwdModal = ref(false)
const telegramBound = ref(false); const telegramChatId = ref(''); const newToken = ref('')
const langOptions = [{ label: '简体中文', value: 'zh-CN' }, { label: 'English', value: 'en' }]

async function loadProfile() {
  try { const res: any = await userApi.getProfile(); Object.assign(profileForm.value, res.data); telegramBound.value = !!res.data?.telegramEnabled } catch {}
}
async function saveProfile() {
  saving.value = true
  try { await userApi.updateProfile(profileForm.value); message.success('保存成功') } catch (err: any) { message.error(err.message) }
  finally { saving.value = false }
}
async function changePassword() {
  pwdSaving.value = true
  try { await userApi.changePassword(pwdForm.value); message.success('密码已修改'); showPwdModal.value = false }
  catch (err: any) { message.error(err.message) } finally { pwdSaving.value = false }
}
async function bindTelegram() {
  if (!telegramChatId.value) { message.warning('请输入 Chat ID'); return }
  try { await userApi.bindTelegram(telegramChatId.value); message.success('绑定成功'); telegramBound.value = true } catch {}
}
async function createApiToken() {
  try { const res: any = await userApi.createApiToken({ name: 'Token ' + new Date().toLocaleDateString() }); newToken.value = res.data?.token || '' } catch {}
}
onMounted(() => loadProfile())
</script>