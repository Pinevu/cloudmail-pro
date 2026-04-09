<template>
  <div class="space-y-6">
    <h2 class="text-xl font-bold text-gray-800 dark:text-white">仪表盘</h2>
    <!-- 统计卡片 -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <n-card v-for="stat in stats" :key="stat.label" :bordered="false" class="shadow-sm hover:shadow-md transition">
        <div class="flex items-center gap-3">
          <div :class="['w-12 h-12 rounded-xl flex items-center justify-center', stat.bgColor]">
            <n-icon :size="24" :color="stat.iconColor"><component :is="stat.icon" /></n-icon>
          </div>
          <div>
            <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ stat.value }}</div>
            <div class="text-sm text-gray-500">{{ stat.label }}</div>
          </div>
        </div>
      </n-card>
    </div>
    <!-- 图表 -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <n-card title="邮件趋势（近30天）" :bordered="false" class="shadow-sm"><v-chart :option="mailChartOption" autoresize style="height: 300px" /></n-card>
      <n-card title="用户增长（近30天）" :bordered="false" class="shadow-sm"><v-chart :option="userChartOption" autoresize style="height: 300px" /></n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NCard, NIcon } from 'naive-ui'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import { PeopleOutline, MailOutline, DocumentOutline, CloudOutline } from '@vicons/ionicons5'
import { adminApi } from '@/api'
use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent])

const dashboardData = ref<any>({})
const stats = computed(() => [
  { label: '总用户', value: dashboardData.value.totalUsers || 0, icon: PeopleOutline, bgColor: 'bg-blue-100', iconColor: '#3b82f6' },
  { label: '活跃用户', value: dashboardData.value.activeUsers || 0, icon: PeopleOutline, bgColor: 'bg-green-100', iconColor: '#10b981' },
  { label: '总邮件', value: dashboardData.value.totalMails || 0, icon: MailOutline, bgColor: 'bg-purple-100', iconColor: '#8b5cf6' },
  { label: '今日邮件', value: dashboardData.value.todayMails || 0, icon: MailOutline, bgColor: 'bg-orange-100', iconColor: '#f59e0b' },
])
const mailChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  legend: { data: ['收件', '发件'] },
  xAxis: { type: 'category', data: (dashboardData.value.dailyMailTrend || []).map((d: any) => d.date) },
  yAxis: { type: 'value' },
  series: [
    { name: '收件', type: 'line', smooth: true, data: (dashboardData.value.dailyMailTrend || []).map((d: any) => d.inbound), areaStyle: { opacity: 0.2 } },
    { name: '发件', type: 'line', smooth: true, data: (dashboardData.value.dailyMailTrend || []).map((d: any) => d.outbound), areaStyle: { opacity: 0.2 } },
  ],
}))
const userChartOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: (dashboardData.value.dailyUserTrend || []).map((d: any) => d.date) },
  yAxis: { type: 'value' },
  series: [{ type: 'bar', data: (dashboardData.value.dailyUserTrend || []).map((d: any) => d.count), itemStyle: { borderRadius: [4, 4, 0, 0] } }],
}))

async function loadData() {
  try { const res: any = await adminApi.getStats(); dashboardData.value = res.data } catch {}
}
onMounted(() => loadData())
</script>