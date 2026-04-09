<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2">
        <n-icon class="text-amber-500"><Star /></n-icon> 星标邮件
      </h2>
      <n-button round @click="refreshMails" :loading="loading">
        <template #icon><n-icon><RefreshOutline /></n-icon></template>刷新
      </n-button>
    </div>
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div v-if="mails.length === 0 && !loading" class="flex flex-col items-center py-20 text-gray-400">
        <n-icon :size="48" class="text-amber-300 mb-3"><StarOutline /></n-icon>
        <p>暂无星标邮件</p>
      </div>
      <div v-else>
        <div v-for="mail in mails" :key="mail.id"
          class="mail-item flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-gray-700/50 cursor-pointer"
          @click="openMail(mail.id)">
          <n-icon :size="18" color="#f59e0b"><Star /></n-icon>
          <div class="flex-shrink-0 w-36 truncate text-sm text-gray-700 dark:text-gray-300">{{ mail.fromName || mail.fromAddress }}</div>
          <div class="flex-1 truncate text-sm font-medium text-gray-900 dark:text-white">{{ mail.subject }}</div>
          <div class="text-xs text-gray-400 w-20 text-right">{{ formatTime(mail.createdAt) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NIcon, useMessage } from 'naive-ui'
import { Star, StarOutline, RefreshOutline } from '@vicons/ionicons5'
import { mailApi } from '@/api'
import dayjs from 'dayjs'
const router = useRouter(); const message = useMessage()
const mails = ref<any[]>([]); const loading = ref(false)
async function refreshMails() {
  loading.value = true
  try { const res: any = await mailApi.list({ isStarred: true }); mails.value = res.data?.list || [] }
  catch { message.error('加载失败') } finally { loading.value = false }
}
function openMail(id: string) { router.push({ name: 'MailDetail', params: { id } }) }
function formatTime(ts: number) { return dayjs.unix(ts).format('M/D HH:mm') }
onMounted(() => refreshMails())
</script>