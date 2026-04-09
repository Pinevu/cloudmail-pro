<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-white">用户管理</h2>
      <div class="flex gap-2">
        <n-input v-model:value="searchQuery" placeholder="搜索用户..." clearable round style="width: 200px" />
        <n-button type="primary" round @click="showAddModal = true">添加用户</n-button>
      </div>
    </div>
    <n-data-table :columns="columns" :data="users" :loading="loading" :pagination="pagination" :row-key="(row: any) => row.id" />
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { NDataTable, NButton, NTag, NInput, NSelect, useMessage } from 'naive-ui'
import { adminApi } from '@/api'
const message = useMessage()
const users = ref<any[]>([]); const loading = ref(false); const searchQuery = ref(''); const showAddModal = ref(false)
const pagination = ref({ page: 1, pageSize: 20, itemCount: 0, onChange: (page: number) => { pagination.value.page = page; loadUsers() } })

const columns = [
  { title: 'ID', key: 'id', width: 180, ellipsis: { tooltip: true } },
  { title: '邮箱', key: 'email' },
  { title: '用户名', key: 'username' },
  { title: '角色', key: 'role', render: (row: any) => h(NTag, { type: row.role === 'super_admin' ? 'error' : row.role === 'admin' ? 'warning' : 'default', size: 'small', round: true }, { default: () => row.role }) },
  { title: '状态', key: 'status', render: (row: any) => h(NTag, { type: row.status === 'active' ? 'success' : 'error', size: 'small', round: true }, { default: () => row.status }) },
  { title: '注册时间', key: 'createdAt', render: (row: any) => new Date(row.createdAt * 1000).toLocaleDateString() },
  { title: '操作', key: 'actions', width: 150, render: (row: any) => h('div', { class: 'flex gap-2' }, [
    h(NSelect, { size: 'small', value: row.status, options: [{ label: 'active', value: 'active' }, { label: 'suspended', value: 'suspended' }], onUpdateValue: (v: string) => updateUserStatus(row.id, v) }, {}),
  ]) },
]

async function loadUsers() {
  loading.value = true
  try { const res: any = await adminApi.listUsers({ page: pagination.value.page, pageSize: pagination.value.pageSize, search: searchQuery.value || undefined }); users.value = res.data?.list || []; pagination.value.itemCount = res.data?.total || 0 } catch {}
  finally { loading.value = false }
}
async function updateUserStatus(id: string, status: string) {
  try { await adminApi.updateUserStatus(id, status); message.success('已更新'); loadUsers() } catch {}
}
onMounted(() => loadUsers())
</script>