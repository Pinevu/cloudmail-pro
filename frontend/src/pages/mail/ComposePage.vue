<template>
  <div class="max-w-4xl mx-auto">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <!-- 标题栏 -->
      <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-gray-800 dark:text-white">写邮件</h3>
        <div class="flex gap-2">
          <n-button round @click="$router.back()">取消</n-button>
          <n-button type="primary" round :loading="sending" @click="sendMail">
            <template #icon><n-icon><SendOutline /></n-icon></template>
            发送
          </n-button>
        </div>
      </div>

      <!-- 表单 -->
      <div class="px-6 py-5 space-y-4">
        <!-- 发件人 -->
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500 w-16 text-right">发件人</span>
          <n-select v-model:value="form.fromAddressId" :options="addressOptions" placeholder="选择发件地址" round class="flex-1" />
        </div>

        <!-- 收件人 -->
        <div class="flex items-start gap-3">
          <span class="text-sm text-gray-500 w-16 text-right pt-2">收件人</span>
          <n-dynamic-tags v-model:value="form.to" class="flex-1" />
        </div>

        <!-- 抄送 -->
        <div v-if="showCc" class="flex items-start gap-3">
          <span class="text-sm text-gray-500 w-16 text-right pt-2">抄送</span>
          <n-dynamic-tags v-model:value="form.cc" class="flex-1" />
        </div>

        <!-- 密送 -->
        <div v-if="showBcc" class="flex items-start gap-3">
          <span class="text-sm text-gray-500 w-16 text-right pt-2">密送</span>
          <n-dynamic-tags v-model:value="form.bcc" class="flex-1" />
        </div>

        <!-- CC/BCC 开关 -->
        <div class="flex gap-2 pl-19" v-if="!showCc || !showBcc">
          <n-button text size="small" @click="showCc = true" v-if="!showCc">+ 抄送</n-button>
          <n-button text size="small" @click="showBcc = true" v-if="!showBcc">+ 密送</n-button>
        </div>

        <!-- 主题 -->
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500 w-16 text-right">主题</span>
          <n-input v-model:value="form.subject" placeholder="邮件主题" round class="flex-1" />
        </div>

        <!-- 内容类型切换 -->
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500 w-16 text-right">格式</span>
          <n-radio-group v-model:value="form.contentType" size="small">
            <n-radio-button value="plain">纯文本</n-radio-button>
            <n-radio-button value="html">HTML</n-radio-button>
          </n-radio-group>
        </div>

        <!-- 内容编辑 -->
        <div class="flex gap-3">
          <span class="text-sm text-gray-500 w-16 text-right pt-2">正文</span>
          <div class="flex-1">
            <n-input
              v-model:value="form.content"
              :type="form.contentType === 'html' ? 'textarea' : 'textarea'"
              placeholder="写邮件内容..."
              :autosize="{ minRows: 12, maxRows: 30 }"
              round
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NIcon, NInput, NSelect, NDynamicTags, NRadioButton, NRadioGroup, useMessage } from 'naive-ui'
import { SendOutline } from '@vicons/ionicons5'
import { mailApi, addressApi } from '@/api'

const router = useRouter()
const message = useMessage()
const sending = ref(false)
const showCc = ref(false)
const showBcc = ref(false)
const addressOptions = ref<Array<{ label: string; value: string }>>([])

const form = ref({
  fromAddressId: '' as string,
  to: [] as string[],
  cc: [] as string[],
  bcc: [] as string[],
  subject: '',
  content: '',
  contentType: 'plain' as 'plain' | 'html',
})

async function sendMail() {
  if (!form.value.to.length) { message.warning('请添加收件人'); return }
  if (!form.value.subject) { message.warning('请填写主题'); return }
  if (!form.value.content) { message.warning('请填写内容'); return }

  sending.value = true
  try {
    await mailApi.send({
      to: form.value.to,
      cc: form.value.cc.length ? form.value.cc : undefined,
      bcc: form.value.bcc.length ? form.value.bcc : undefined,
      subject: form.value.subject,
      content: form.value.content,
      contentType: form.value.contentType,
      fromAddressId: form.value.fromAddressId || undefined,
    })
    message.success('邮件发送成功 🎉')
    router.push({ name: 'Sent' })
  } catch (err: any) {
    message.error(err.message || '发送失败')
  } finally {
    sending.value = false
  }
}

async function loadAddresses() {
  try {
    const res: any = await addressApi.list()
    addressOptions.value = (res.data || []).map((a: any) => ({ label: a.address, value: a.id }))
    if (addressOptions.value.length > 0 && !form.value.fromAddressId) {
      const defaultAddr = (res.data || []).find((a: any) => a.isDefault)
      form.value.fromAddressId = defaultAddr?.id || addressOptions.value[0].value
    }
  } catch {}
}

onMounted(() => loadAddresses())
</script>