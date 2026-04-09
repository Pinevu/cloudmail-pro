<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-white">已发送</h2>
      <n-button round @click="refreshMails" :loading="loading">
        <template #icon><n-icon><RefreshOutline /></n-icon></template>
        刷新
      </n-button>
    </div>
    <MaiTable :mails="mails" :loading="loading" :total="total" v-model:page="currentPage" v-model:page-size="pageSize" @click-mail="openMail" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NIcon, useMessage } from 'naive-ui'
import { RefreshOutline } from '@vicons/ionicons5'
import { mailApi } from '@/api'

const router = useRouter()
const message = useMessage()
const mails = ref<any[]>([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

async function refreshMails() {
  loading.value = true
  try {
    const res: any = await mailApi.list({ page: currentPage.value, pageSize: pageSize.value, direction: 'outbound' })
    mails.value = res.data?.list || []
    total.value = res.data?.total || 0
  } catch { message.error('加载失败') }
  finally { loading.value = false }
}

function openMail(id: string) { router.push({ name: 'MailDetail', params: { id } }) }
watch([currentPage, pageSize], () => refreshMails())
onMounted(() => refreshMails())
</script>