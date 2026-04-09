<template>
  <div class="space-y-4">
    <!-- 搜索与操作栏 -->
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3 flex-1 min-w-[200px]">
        <n-input v-model:value="searchQuery" placeholder="搜索邮件..." clearable round class="max-w-xs">
          <template #prefix><n-icon :size="18"><SearchOutline /></n-icon></template>
        </n-input>
        <n-select v-model:value="filterAddress" :options="addressOptions" placeholder="全部邮箱" clearable round style="width: 180px" />
      </div>
      <div class="flex items-center gap-2">
        <n-button v-if="selectedIds.length > 0" type="error" size="small" round @click="batchDelete">
          <template #icon><n-icon><TrashOutline /></n-icon></template>
          删除选中 ({{ selectedIds.length }})
        </n-button>
        <n-button v-if="selectedIds.length > 0" size="small" round @click="batchMarkRead">
          <template #icon><n-icon><CheckmarkDoneOutline /></n-icon></template>
          标为已读
        </n-button>
        <n-button round @click="refreshMails" :loading="loading">
          <template #icon><n-icon><RefreshOutline /></n-icon></template>
          刷新
        </n-button>
      </div>
    </div>

    <!-- 邮件列表 -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div v-if="loading && mails.length === 0" class="flex items-center justify-center py-20">
        <n-spin size="large" />
      </div>

      <div v-else-if="mails.length === 0" class="flex flex-col items-center justify-center py-20 text-gray-400">
        <n-icon :size="48" class="mb-3 text-gray-300"><MailOpenOutline /></n-icon>
        <p class="text-lg">暂无邮件</p>
        <p class="text-sm mt-1">收件箱空空如也~</p>
      </div>

      <div v-else>
        <div
          v-for="mail in mails"
          :key="mail.id"
          class="mail-item flex items-center gap-3 px-5 py-4 border-b border-gray-50 dark:border-gray-700/50 cursor-pointer group"
          :class="{ 'bg-blue-50/50 dark:bg-blue-900/10': !mail.isRead }"
          @click="openMail(mail.id)"
        >
          <!-- 选择框 -->
          <n-checkbox :checked="selectedIds.includes(mail.id)" @update:checked="(v: boolean) => toggleSelect(mail.id, v)" @click.stop />

          <!-- 星标 -->
          <button class="flex-shrink-0 transition-all hover:scale-110" @click.stop="toggleStar(mail)">
            <n-icon :size="18" :color="mail.isStarred ? '#f59e0b' : '#d1d5db'" class="transition-colors">
              <StarOutline v-if="!mail.isStarred" /><Star v-else />
            </n-icon>
          </button>

          <!-- 发件人 -->
          <div class="flex-shrink-0 w-36 truncate">
            <span :class="['text-sm', !mail.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300']">
              {{ getFromName(mail) }}
            </span>
          </div>

          <!-- 主题 + 预览 -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span v-if="!mail.isRead" class="unread-dot w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
              <span :class="['truncate text-sm', !mail.isRead ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300']">
                {{ mail.subject }}
              </span>
            </div>
          </div>

          <!-- 附件标识 -->
          <n-icon v-if="mail.hasAttachments" :size="16" class="text-gray-400 flex-shrink-0"><AttachOutline /></n-icon>

          <!-- 时间 -->
          <div class="flex-shrink-0 text-xs text-gray-400 w-20 text-right">
            {{ formatTime(mail.createdAt) }}
          </div>
        </div>
      </div>

      <!-- 分页 -->
      <div v-if="total > pageSize" class="flex justify-center py-4 border-t border-gray-50 dark:border-gray-700/50">
        <n-pagination v-model:page="currentPage" :page-count="Math.ceil(total / pageSize)" size="small" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NButton, NIcon, NSelect, NCheckbox, NPagination, NSpin, useMessage } from 'naive-ui'
import {
  SearchOutline, RefreshOutline, TrashOutline, CheckmarkDoneOutline,
  StarOutline, Star, AttachOutline, MailOpenOutline,
} from '@vicons/ionicons5'
import { mailApi, addressApi } from '@/api'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

const router = useRouter()
const message = useMessage()

const mails = ref<any[]>([])
const loading = ref(false)
const searchQuery = ref('')
const filterAddress = ref<string | null>(null)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)
const selectedIds = ref<string[]>([])
const addressOptions = ref<Array<{ label: string; value: string }>>([])

async function refreshMails() {
  loading.value = true
  try {
    const res: any = await mailApi.list({
      page: currentPage.value,
      pageSize: pageSize.value,
      direction: 'inbound',
      search: searchQuery.value || undefined,
      addressId: filterAddress.value || undefined,
    })
    mails.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch (err: any) {
    message.error('加载邮件失败')
  } finally {
    loading.value = false
  }
}

async function loadAddresses() {
  try {
    const res: any = await addressApi.list()
    addressOptions.value = (res.data || []).map((a: any) => ({ label: a.address, value: a.id }))
  } catch {}
}

function openMail(id: string) {
  router.push({ name: 'MailDetail', params: { id } })
}

function getFromName(mail: any): string {
  return mail.fromName || mail.fromAddress?.split('@')[0] || '未知'
}

function formatTime(ts: number): string {
  const d = dayjs.unix(ts)
  const now = dayjs()
  if (d.isSame(now, 'day')) return d.format('HH:mm')
  if (d.isSame(now.subtract(1, 'day'), 'day')) return '昨天'
  if (d.isSame(now, 'year')) return d.format('M月D日')
  return d.format('YYYY/MM/DD')
}

async function toggleStar(mail: any) {
  try {
    await mailApi.star(mail.id, !mail.isStarred)
    mail.isStarred = !mail.isStarred
  } catch { message.error('操作失败') }
}

function toggleSelect(id: string, checked: boolean) {
  if (checked) { selectedIds.value.push(id) } else { selectedIds.value = selectedIds.value.filter(i => i !== id) }
}

async function batchDelete() {
  try {
    await mailApi.batchDelete(selectedIds.value)
    message.success('删除成功')
    selectedIds.value = []
    refreshMails()
  } catch { message.error('删除失败') }
}

async function batchMarkRead() {
  try {
    await mailApi.batchRead(selectedIds.value)
    message.success('已标为已读')
    selectedIds.value = []
    refreshMails()
  } catch { message.error('操作失败') }
}

watch([searchQuery, filterAddress, currentPage], () => refreshMails())

onMounted(() => {
  refreshMails()
  loadAddresses()
})
</script>