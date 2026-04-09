<template>
  <n-layout has-sider class="h-screen">
    <!-- 侧边栏 -->
    <n-layout-sider
      bordered
      :width="240"
      :native-scrollbar="false"
      collapse-mode="width"
      :collapsed-width="64"
      :collapsed="collapsed"
      show-trigger
      @collapse="collapsed = true"
      @expand="collapsed = false"
      class="sidebar-gradient"
    >
      <div class="flex flex-col h-full">
        <!-- Logo -->
        <div class="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div class="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center backdrop-blur-sm">
            <n-icon size="22" color="#fff"><MailOutlined /></n-icon>
          </div>
          <transition name="fade">
            <span v-if="!collapsed" class="text-white font-semibold text-lg tracking-wide">CloudMail</span>
          </transition>
        </div>

        <!-- 写邮件按钮 -->
        <div class="px-3 py-4">
          <n-button
            type="primary"
            block
            round
            size="large"
            @click="$router.push({ name: 'Compose' })"
            :class="collapsed ? 'px-0' : ''"
          >
            <template #icon><n-icon><CreateOutlined /></n-icon></template>
            <span v-if="!collapsed">写邮件</span>
          </n-button>
        </div>

        <!-- 导航菜单 -->
        <n-menu
          :value="activeMenu"
          :collapsed="collapsed"
          :collapsed-width="64"
          :collapsed-icon-size="22"
          :options="menuOptions"
          :theme-overrides="menuThemeOverrides"
          @update:value="handleMenuClick"
        />

        <!-- 底部 -->
        <div class="mt-auto border-t border-white/10 px-3 py-3">
          <n-menu
            :collapsed="collapsed"
            :collapsed-width="64"
            :collapsed-icon-size="22"
            :options="bottomMenuOptions"
            :theme-overrides="menuThemeOverrides"
            @update:value="handleBottomMenuClick"
          />
        </div>
      </div>
    </n-layout-sider>

    <!-- 主内容区域 -->
    <n-layout class="flex-1">
      <!-- 顶部栏 -->
      <n-layout-header bordered class="h-16 flex items-center justify-between px-6 bg-white dark:bg-gray-800 shadow-sm">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">{{ currentPageTitle }}</h2>
        </div>
        <div class="flex items-center gap-4">
          <!-- 主题切换 -->
          <n-button quaternary circle @click="themeStore.toggleTheme">
            <template #icon>
              <n-icon size="20"><SunOutlined v-if="themeStore.isDark" /><MoonOutlined v-else /></n-icon>
            </template>
          </n-button>
          <!-- 通知 -->
          <n-badge :value="unreadCount" :max="99">
            <n-button quaternary circle>
              <template #icon><n-icon size="20"><NotificationsOutline /></n-icon></template>
            </n-button>
          </n-badge>
          <!-- 用户菜单 -->
          <n-dropdown :options="userMenuOptions" @select="handleUserMenu">
            <div class="flex items-center gap-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg px-3 py-1.5 transition">
              <n-avatar round size="small" :src="authStore.user?.avatar || undefined">
                {{ authStore.user?.nickname?.charAt(0) || authStore.user?.username?.charAt(0) || 'U' }}
              </n-avatar>
              <span class="text-sm text-gray-700 dark:text-gray-200 hidden sm:block">{{ authStore.user?.nickname || authStore.user?.username }}</span>
              <n-icon size="16" class="text-gray-400"><ChevronDownOutline /></n-icon>
            </div>
          </n-dropdown>
        </div>
      </n-layout-header>

      <!-- 内容 -->
      <n-layout-content class="p-6" :native-scrollbar="false">
        <router-view />
      </n-layout-content>
    </n-layout>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, computed, h, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NLayout, NLayoutSider, NLayoutHeader, NLayoutContent,
  NMenu, NButton, NIcon, NAvatar, NDropdown, NBadge,
} from 'naive-ui'
import type { MenuOption, DropdownOption } from 'naive-ui'
import {
  MailOutlined, CreateOutlined, SendOutlined, StarOutlined,
  AtOutlined, SettingsOutlined, NotificationsOutline,
  SunOutlined, MoonOutlined, ChevronDownOutline,
  AdminPanelSettingsOutlined, LogoutOutlined,
  PersonOutline,
} from '@vicons/ionicons5'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const themeStore = useThemeStore()
const collapsed = ref(false)
const unreadCount = ref(0)

const currentPageTitle = computed(() => (route.meta.title as string) || 'CloudMail Pro')

const activeMenu = computed(() => route.name as string)

const menuOptions: MenuOption[] = [
  { label: '收件箱', key: 'Inbox', icon: () => h(NIcon, null, { default: () => h(MailOutlined) }) },
  { label: '已发送', key: 'Sent', icon: () => h(NIcon, null, { default: () => h(SendOutlined) }) },
  { label: '星标邮件', key: 'Starred', icon: () => h(NIcon, null, { default: () => h(StarOutlined) }) },
  { label: '邮箱地址', key: 'Addresses', icon: () => h(NIcon, null, { default: () => h(AtOutlined) }) },
]

const bottomMenuOptions: MenuOption[] = [
  { label: '设置', key: 'Settings', icon: () => h(NIcon, null, { default: () => h(SettingsOutlined) }) },
]

if (authStore.isAdmin) {
  bottomMenuOptions.unshift({
    label: '管理后台', key: 'Admin', icon: () => h(NIcon, null, { default: () => h(AdminPanelSettingsOutlined) }),
  })
}

const userMenuOptions: DropdownOption[] = [
  { label: '个人设置', key: 'settings', icon: () => h(NIcon, null, { default: () => h(PersonOutline) }) },
  { type: 'divider', key: 'd1' },
  { label: '退出登录', key: 'logout', icon: () => h(NIcon, null, { default: () => h(LogoutOutlined) }) },
]

const menuThemeOverrides = {
  itemTextColorActive: '#fff',
  itemTextColorActiveHover: '#fff',
  itemColorActive: 'rgba(255,255,255,0.15)',
  itemColorActiveHover: 'rgba(255,255,255,0.2)',
  itemTextColorChildActive: '#fff',
  arrowColorChildActive: '#fff',
}

function handleMenuClick(key: string) {
  router.push({ name: key })
}

function handleBottomMenuClick(key: string) {
  if (key === 'Admin') {
    router.push('/admin')
  } else {
    router.push({ name: key })
  }
}

function handleUserMenu(key: string) {
  if (key === 'settings') {
    router.push({ name: 'Settings' })
  } else if (key === 'logout') {
    authStore.logout()
    router.push({ name: 'Login' })
  }
}

onMounted(async () => {
  if (!authStore.user) {
    await authStore.fetchUser()
  }
})
</script>

<style scoped>
.sidebar-gradient {
  background: linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>