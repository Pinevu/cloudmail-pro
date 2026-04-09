import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const isDark = ref(localStorage.getItem('theme') === 'dark')

  function toggleTheme() {
    isDark.value = !isDark.value
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', isDark.value)
  }

  // 初始化时应用主题
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  }

  return { isDark, toggleTheme }
}, {
  persist: {
    pick: ['isDark'],
  },
})