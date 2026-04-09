<template>
  <div class="min-h-screen flex">
    <aside class="w-56 bg-gradient-to-b from-gray-900 to-gray-800 text-white flex-shrink-0">
      <div class="p-4 border-b border-gray-700/50">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center"><n-icon color="#fff"><ShieldCheckmarkOutline /></n-icon></div>
          <span class="font-semibold">管理后台</span>
        </div>
      </div>
      <n-menu :options="menuOptions" :value="activeMenu" @update:value="handleMenu" inverted />
      <div class="mt-auto p-4 border-t border-gray-700/50">
        <n-button text block @click="$router.push('/')" class="text-gray-400 hover:text-white">
          <template #icon><n-icon><ArrowBackOutline /></n-icon></template>
          返回前台
        </n-button>
      </div>
    </aside>
    <main class="flex-1 bg-gray-50 dark:bg-gray-900 p-6 overflow-auto"><router-view /></main>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NMenu, NButton, NIcon } from 'naive-ui'
import { ShieldCheckmarkOutline, HomeOutline, PeopleOutline, MailOutline, SettingsOutline, ArrowBackOutline } from '@vicons/ionicons5'
const route = useRoute(); const router = useRouter()
const activeMenu = computed(() => route.name as string)
const menuOptions = [
  { label: '仪表盘', key: 'AdminDashboard', icon: () => h(NIcon, null, { default: () => h(HomeOutline) }) },
  { label: '用户管理', key: 'AdminUsers', icon: () => h(NIcon, null, { default: () => h(PeopleOutline) }) },
  { label: '邮件管理', key: 'AdminMails', icon: () => h(NIcon, null, { default: () => h(MailOutline) }) },
  { label: '系统设置', key: 'AdminSettings', icon: () => h(NIcon, null, { default: () => h(SettingsOutline) }) },
]
function handleMenu(key: string) { router.push({ name: key }) }
</script>