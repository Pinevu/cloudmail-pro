<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-white">邮件管理</h2>
      <n-input v-model:value="searchQuery" placeholder="搜索邮件..." clearable round style="width: 200px" />
    </div>
    <n-data-table :columns="columns" :data="mails" :loading="loading" :pagination="pagination" :row-key="(row: any) => row.id" />
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { NDataTable, NButton, NTag, NInput, useMessage } from 'naive-ui'
import { adminApi } from '@/api'
const message = useMessage()
const mails = ref<any[]>([]); const loading = ref(false); const searchQuery = ref('')
const pagination = ref({ page: 1, pageSize: 20, itemCount: 0, onChange: (page: number) => { pagination.value.page = page; loadMails() } })
const columns = [
  { title: 'ID', key: 'id', width: 180, ellipsis: { tooltip: true } },
  { title: '方向', key: 'direction', render: (row: any) => h(NTag, { type: row.direction === 'inbound' ? 'info' : 'success', size: 'small', round: true }, { default: () => row.direction === 'inbound' ? '收件' : '发件' }) },
  { title: '发件人', key: 'fromAddress', ellipsis: { tooltip: true } },
  { title: '主题', key: 'subject', ellipsis: { tooltip: true } },
  { title: '状态', key: 'status', render: (row: any) => h(NTag, { type: row.status === 'delivered' ? 'success' : row.status === 'sent' ? 'info' : 'error', size: 'small' }, { default: () => row.status }) },
  { title: '时间', key: 'createdAt', render: (row: any) => new Date(row.createdAt * 1000).toLocaleString() },
  { title: '操作', key: 'actions', width: 80, render: (row: any) => h(NButton, { size: 'small', round: true, type: 'error', onClick: () => deleteMail(row.id) }, { default: () => '删除' }) },
]

async function loadMails() {
  loading.value = true
  try { const res: any = await adminApi.listMails({ page: pagination.value.page, pageSize: pagination.value.pageSize }); mails.value = res.data?.list || []; pagination.value.itemCount = res.data?.total || 0 } catch {}
  finally { loading.value = false }
}
async function deleteMail(id: string) {
  try { await adminApi.deleteMail(id); message.success('已删除'); loadMails() } catch {}
}
onMounted(() => loadMails())
</script>