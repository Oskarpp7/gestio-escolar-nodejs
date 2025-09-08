<template>
  <div class="flex items-center gap-2">
    <label class="label">Centre</label>
    <select class="input !py-2" :value="modelValue" @change="onChange">
      <option :value="''" disabled>Selecciona un centre</option>
      <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}<span v-if="t.code"> ({{ t.code }})</span></option>
    </select>
  </div>
  
</template>

<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTenantStore } from '@/stores/tenant'

const props = defineProps({ modelValue: [Number, String, null] })
const emit = defineEmits(['update:modelValue'])

const tenantStore = useTenantStore()
const { tenants } = storeToRefs(tenantStore)

onMounted(() => {
  if (!tenants.value?.length) tenantStore.fetchTenants()
})

function onChange(e) {
  const id = e.target.value ? Number(e.target.value) : null
  tenantStore.setTenant(id)
  emit('update:modelValue', id)
}
</script>
