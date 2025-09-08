<template>
  <div class="flex items-center gap-2">
    <label class="label">Centre</label>
    <select class="input !py-2" :value="modelValue" @change="$emit('update:modelValue', Number($event.target.value))">
      <option :value="null" disabled>Selecciona un centre</option>
      <option v-for="t in tenants" :key="t.id" :value="t.id">{{ t.name }}</option>
    </select>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useTenantStore } from '@/stores/tenant'

defineProps({ modelValue: [Number, String, null] })
defineEmits(['update:modelValue'])

const tenantStore = useTenantStore()
const { tenants } = storeToRefs(tenantStore)

onMounted(() => {
  if (!tenants.value?.length) tenantStore.fetchTenants()
})
</script>
