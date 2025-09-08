<template>
  <div class="p-6 max-w-7xl mx-auto space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">Configuració de preus per centre</h1>
      <div class="flex items-center gap-3">
        <TenantSelector v-model="tenantId" />
        <button class="btn btn-primary" @click="openCreate">Afegir</button>
      </div>
    </div>

    <div class="card">
      <PriceConfigTable
        :items="items"
        :loading="loading"
        :page="page"
        :limit="limit"
        :total="total"
        @changePage="(p) => { page = p; fetchList() }"
        @edit="openEdit"
        @delete="confirmDelete"
      />
    </div>

    <PriceConfigForm
      v-if="showForm"
      :initial="editing || { tenant_id: tenantId }"
      @close="closeForm"
      @save="handleSave"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { listPricingConfigs, createPricingConfig, updatePricingConfig, deletePricingConfig } from '@/api/pricing'
import TenantSelector from '@/components/admin/TenantSelector.vue'
import PriceConfigTable from '@/components/admin/PriceConfigTable.vue'
import PriceConfigForm from '@/components/admin/PriceConfigForm.vue'

const toast = useToast()

const tenantId = ref(null)
const items = ref([])
const loading = ref(false)
const page = ref(1)
const limit = ref(20)
const total = ref(0)

const showForm = ref(false)
const editing = ref(null)

const fetchList = async () => {
  if (!tenantId.value) return
  loading.value = true
  try {
    const res = await listPricingConfigs({ page: page.value, limit: limit.value, tenantId: tenantId.value })
    items.value = res.data || res.items || []
    total.value = res.total || res.count || items.value.length
  } catch (e) {
    console.error(e)
    toast.error('No s\'ha pogut carregar la llista')
  } finally {
    loading.value = false
  }
}

const openCreate = () => { editing.value = null; showForm.value = true }
const openEdit = (row) => { editing.value = row; showForm.value = true }
const closeForm = () => { showForm.value = false }

const handleSave = async (payload) => {
  try {
    if (editing.value?.id) {
      await updatePricingConfig(editing.value.id, payload)
      toast.success('Configuració actualitzada')
    } else {
      await createPricingConfig(payload)
      toast.success('Configuració creada')
    }
    showForm.value = false
    fetchList()
  } catch (e) {
    console.error(e)
    toast.error(e?.response?.data?.message || 'Error desant configuració')
  }
}

const confirmDelete = async (row) => {
  if (!confirm('Eliminar configuració?')) return
  try {
    await deletePricingConfig(row.id)
    toast.success('Configuració eliminada')
    fetchList()
  } catch (e) {
    console.error(e)
    toast.error('No s\'ha pogut eliminar')
  }
}

watch(tenantId, () => {
  page.value = 1
  fetchList()
})

onMounted(() => {
  // es carrega quan es seleccioni un centre
})
</script>
