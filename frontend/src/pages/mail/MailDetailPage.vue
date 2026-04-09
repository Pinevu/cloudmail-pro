<template>
  <div class="max-w-4xl mx-auto">
    <div v-if="loading" class="flex justify-center py-20"><n-spin size="large" /></div>

    <div v-else-if="mail" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <!-- 顶部操作栏 -->
      <div class="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div class="flex gap-2">
          <n-button round size="small" @click="$router.back()">← 返回</n-button>
          <n-button round size="small" @click="toggleStar">
            <template #icon><n-icon><StarOutline v-if="!mail.isStarred" /><Star v-else /></n-icon></template>
          </n-button>
        </div>
        <div class="flex gap-2">
          <n-button round size="small" @click="replyMail">
            <template #icon><n-icon><ReturnDownBackOutline /></n-icon></template>
            回复
          </n-button>
          <n-button type="error" round size="small" @click="deleteMail">
            <template #icon><n-icon><TrashOutline /></n-icon></template>
            删除
          </n-button>
        </div>
      </div>

      <!-- 邮件头 -->
      <div class="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">{{ mail.subject }}</h2>
        <div class="flex items-start gap-4">
          <n-avatar round :size="40">{{ mail.from?.name?.charAt(0) || mail.from?.address?.charAt(0) || '?' }}</n-avatar>
          <div class="flex-1">
            <div class="flex items-center gap-2">
              <span class="font-semibold text-gray-900 dark:text-white">{{ mail.from?.name || mail.from?.address }}</span>
              <n-tag v-if="mail.direction === 'inbound'" size="small" type="info" round>收件</n-tag>
              <n-tag v-else size="small" type="success" round>发件</n-tag>
            </div>
            <div class="text-sm text-gray-500 mt-1">
              <span>{{ mail.from?.address }}</span>
              <span class="mx-2">→</span>
              <span>{{ mail.to?.map((t: any) => t.address).join(', ') }}</span>
            </div>
            <div class="text-xs text-gray-400 mt-1">{{ formatTime(mail.createdAt) }}</div>
          </div>
        </div>
      </div>

      <!-- 邮件正文 -->
      <div class="px-6 py-6">
        <div v-if="mail.contentHtml" v-html="mail.contentHtml" class="prose dark:prose-invert max-w-none"></div>
        <div v-else class="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">{{ mail.contentPlain }}</div>
      </div>

      <!-- 附件 -->
      <div v-if="mail.attachments?.length" class="px-6 py-4 border-t border-gray-100 dark:border-gray-700">
        <h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          <n-icon class="mr-1"><AttachOutline /></n-icon> 附件 ({{ mail.attachments.length }})
        </h4>
        <div class="flex flex-wrap gap-3">
          <div v-for="att in mail.attachments" :key="att.id"
            class="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition"
            @click="downloadAttachment(att)">
            <n-icon :size="20" class="text-blue-500"><DocumentOutline /></n-icon>
            <div>
              <div class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ att.filename }}</div>
              <div class="text-xs text-gray-400">{{ formatFileSize(att.sizeBytes) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NIcon, NAvatar, NTag, NSpin, useMessage, useDialog } from 'naive-ui'
import { StarOutline, Star, TrashOutline, AttachOutline, DocumentOutline, ReturnDownBackOutline } from '@vicons/ionicons5'
import { mailApi } from '@/api'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const mail = ref<any>(null)
const loading = ref(true)

async function loadMail() {
  loading.value = true
  try {
    const res: any = await mailApi.getDetail(route.params.id as string)
    mail.value = res.data
  } catch (err: any) { message.error('加载失败') }
  finally { loading.value = false }
}

function formatTime(ts: number) { return dayjs.unix(ts).format('YYYY年M月D日 HH:mm') }
function formatFileSize(bytes: number) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

async function toggleStar() {
  if (!mail.value) return
  await mailApi.star(mail.value.id, !mail.value.isStarred)
  mail.value.isStarred = !mail.value.isStarred
}

function replyMail() {
  router.push({ name: 'Compose', query: { replyTo: mail.value?.id } })
}

function deleteMail() {
  dialog.warning({
    title: '确认删除',
    content: '确定要删除这封邮件吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      await mailApi.delete(mail.value.id)
      message.success('已删除')
      router.back()
    },
  })
}

function downloadAttachment(att: any) {
  window.open(att.downloadUrl, '_blank')
}

onMounted(() => loadMail())
</script>