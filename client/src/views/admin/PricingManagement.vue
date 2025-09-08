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
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label class="label">Servei</label>
          <select v-model="filters.service_type" class="input">
            <option value="">Tots</option>
            <option value="MENJADOR">MENJADOR</option>
            <option value="ACOLLIDA">ACOLLIDA</option>
          </select>
        </div>
        <div>
          <label class="label">Contracte</label>
          <select v-model="filters.contract_type" class="input">
            <option value="">Tots</option>
            <option value="FIXE">FIXE</option>
            <option value="ESPORADIC">ESPORADIC</option>
          </select>
        </div>
        <div>
          <label class="label">Subtipus</label>
          <select v-model="filters.subtype" class="input">
            <option value="">Tots</option>
            <option value="MATI">MATI</option>
            <option value="TARDA">TARDA</option>
          </select>
        </div>
        <div>
          <label class="label">Actiu</label>
          <select v-model="filters.is_active" class="input">
            <option value="">Tots</option>
            <option value="true">Actius</option>
            <option value="false">Inactius</option>
          </select>
        </div>
      </div>
      <div class="mt-3 flex gap-2 justify-end">
        <button class="btn btn-secondary" @click="resetFilters">Netejar</button>
        <button class="btn btn-primary" @click="applyFilters">Aplicar</button>
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

const filters = ref({ service_type: '', contract_type: '', subtype: '', is_active: '' })

const showForm = ref(false)
const editing = ref(null)

const fetchList = async () => {
  if (!tenantId.value) return
  loading.value = true
  try {
  const params = { page: page.value, limit: limit.value, tenantId: tenantId.value }
  if (filters.value.service_type) params.service_type = filters.value.service_type
  if (filters.value.contract_type) params.contract_type = filters.value.contract_type
  if (filters.value.subtype !== '') params.subtype = filters.value.subtype
  if (filters.value.is_active !== '') params.is_active = filters.value.is_active
  const res = await listPricingConfigs(params)
    items.value = res.data || res.items || []
  const pag = res.pagination
  total.value = (pag && (pag.total || pag.count)) || res.total || res.count || items.value.length
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

function resetFilters() {
  filters.value = { service_type: '', contract_type: '', subtype: '', is_active: '' }
  page.value = 1
  fetchList()
}

function applyFilters() {
  page.value = 1
  fetchList()
}
</script>
