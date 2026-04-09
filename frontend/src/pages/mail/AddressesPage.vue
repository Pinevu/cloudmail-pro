<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-white">邮箱地址管理</h2>
      <n-button type="primary" round @click="showModal = true">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        添加地址
      </n-button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="addr in addresses" :key="addr.id"
        class="relative bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition">
        <div class="absolute top-4 right-4">
          <n-tag v-if="addr.isDefault" type="success" size="small" round>默认</n-tag>
          <n-tag v-else :type="addr.status === 'active' ? 'info' : 'error'" size="small" round>
            {{ addr.status === 'active' ? '活动' : '禁用' }}
          </n-tag>
        </div>
        <div class="flex items-center gap-3 mb-3">
          <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
            <n-icon size="20" color="#fff"><AtOutline /></n-icon>
          </div>
          <div>
            <div class="font-semibold text-gray-900 dark:text-white">{{ addr.alias || '未命名' }}</div>
            <div class="text-sm text-gray-500">{{ addr.address }}</div>
          </div>
        </div>
        <div class="text-xs text-gray-400 space-y-1">
          <div v-if="addr.forwardingEnabled" class="flex items-center gap-1">
            <n-icon><ArrowForwardOutline /></n-icon> 转发至 {{ addr.forwardingTo }}
          </div>
          <div v-if="addr.telegramNotify" class="flex items-center gap-1 text-blue-400">
            <n-icon><LogoTelegram /></n-icon> Telegram 通知已启用
          </div>
        </div>
        <div class="flex gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <n-button size="small" round @click="editAddress(addr)">编辑</n-button>
          <n-button size="small" round type="error" @click="deleteAddress(addr.id)">删除</n-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="addresses.length === 0" class="col-span-full flex flex-col items-center py-12 text-gray-400">
        <n-icon :size="48" class="mb-3"><AtOutline /></n-icon>
        <p>尚无邮箱地址</p>
        <n-button type="primary" round class="mt-4" @click="showModal = true">立即添加</n-button>
      </div>
    </div>

    <!-- 添加/编辑弹窗 -->
    <n-modal v-model:show="showModal" preset="card" title="添加邮箱地址" style="width: 480px" :bordered="false">
      <n-form :model="newAddress" label-placement="left" label-width="80">
        <n-form-item label="地址">
          <n-input-group>
            <n-input v-model:value="newAddress.localPart" placeholder="username" style="width: 160px" />
            <n-input-group-label @>{{ domain }}</n-input-group-label>
          </n-input-group>
        </n-form-item>
        <n-form-item label="别名"><n-input v-model:value="newAddress.alias" placeholder="可选" /></n-form-item>
        <n-form-item label="转发至"><n-input v-model:value="newAddress.forwardingTo" placeholder="转发邮箱（可选）" /></n-form-item>
        <n-form-item label="TG 通知"><n-switch v-model:value="newAddress.telegramNotify" /></n-form-item>
      </n-form>
      <template #footer>
        <div class="flex justify-end gap-2">
          <n-button round @click="showModal = false">取消</n-button>
          <n-button type="primary" round :loading="saving" @click="saveAddress">保存</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NButton, NIcon, NForm, NFormItem, NInput, NInputGroup, NInputGroupLabel, NSwitch, NTag, NModal, useMessage } from 'naive-ui'
import { AddOutline, AtOutline, ArrowForwardOutline, LogoTelegram } from '@vicons/ionicons5'
import { addressApi, settingsApi } from '@/api'
const message = useMessage()
const addresses = ref<any[]>([]); const showModal = ref(false); const saving = ref(false); const domain = ref('')
const newAddress = ref({ localPart: '', alias: '', forwardingTo: '', telegramNotify: false })

async function loadAddresses() {
  try { const res: any = await addressApi.list(); addresses.value = res.data || [] } catch {}
}
async function loadDomain() {
  try { const res: any = await settingsApi.getPublic(); domain.value = res.data?.domain || 'example.com' } catch {}
}
async function saveAddress() {
  if (!newAddress.value.localPart) { message.warning('请输入地址'); return }
  saving.value = true
  try {
    await addressApi.create({
      address: newAddress.value.localPart + '@' + domain.value,
      alias: newAddress.value.alias || undefined,
      forwardingTo: newAddress.value.forwardingTo || undefined,
      telegramNotify: newAddress.value.telegramNotify,
    })
    message.success('添加成功')
    showModal.value = false
    loadAddresses()
  } catch (err: any) { message.error(err.message || '添加失败') }
  finally { saving.value = false }
}
function editAddress(addr: any) { /* TODO */ }
async function deleteAddress(id: string) { await addressApi.delete(id); loadAddresses() }
onMounted(() => { loadAddresses(); loadDomain() })
</script>