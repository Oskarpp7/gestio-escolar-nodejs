<template>
  <div class="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
    <div class="card w-full max-w-2xl">
      <div class="flex items-center justify-between mb-4">
        <div class="card-title">{{ form.id ? 'Editar' : 'Crear' }} configuració</div>
        <button class="btn btn-secondary" @click="$emit('close')">Tancar</button>
      </div>

      <form @submit.prevent="submit" class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="label">Servei</label>
          <select v-model="form.service_type" class="input" required>
            <option value="MENJADOR">MENJADOR</option>
            <option value="ACOLLIDA">ACOLLIDA</option>
          </select>
        </div>
        <div>
          <label class="label">Contracte</label>
          <select v-model="form.contract_type" class="input" required>
            <option value="FIXE">FIXE</option>
            <option value="ESPORADIC">ESPORADIC</option>
          </select>
        </div>
        <div>
          <label class="label">Subtipus</label>
          <select v-model="form.subtype" class="input">
            <option value="">-</option>
            <option value="MATI">MATI</option>
            <option value="TARDA">TARDA</option>
          </select>
        </div>
        <div>
          <label class="label">Vàlid des de</label>
          <input type="date" v-model="form.valid_from" class="input" />
        </div>
        <div>
          <label class="label">Vàlid fins a</label>
          <input type="date" v-model="form.valid_to" class="input" />
        </div>
        <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="label">Present (€)</label>
            <input type="number" step="0.01" v-model.number="form.present" class="input" />
          </div>
          <div>
            <label class="label">Absent (€)</label>
            <input type="number" step="0.01" v-model.number="form.absent" class="input" />
          </div>
          <div>
            <label class="label">Justificat (€)</label>
            <input type="number" step="0.01" v-model.number="form.justified" class="input" />
          </div>
          <div>
            <label class="label">Esporàdic (€)</label>
            <input type="number" step="0.01" v-model.number="form.sporadic" class="input" />
          </div>
        </div>
        <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="label">Descompte BC70 (%)</label>
            <input type="number" step="1" v-model.number="form.bc70" class="input" />
          </div>
          <div>
            <label class="label">Descompte BC100 (%)</label>
            <input type="number" step="1" v-model.number="form.bc100" class="input" />
          </div>
        </div>

        <div class="md:col-span-2 flex justify-end gap-2 mt-2">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancel·lar</button>
          <button type="submit" class="btn btn-primary">Desar</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'

const props = defineProps({ initial: { type: Object, default: () => ({}) } })
const emit = defineEmits(['save', 'close'])

const form = reactive(defaultForm())

watch(() => props.initial, (val) => {
  Object.assign(form, defaultForm(), mapInitial(val))
}, { immediate: true, deep: true })

function defaultForm() {
  return {
    id: null,
    tenant_id: null,
    service_type: 'MENJADOR',
    contract_type: 'FIXE',
    subtype: '',
    valid_from: '',
    valid_to: '',
    present: null,
    absent: null,
    justified: null,
    sporadic: null,
    bc70: null,
    bc100: null
  }
}

function mapInitial(init) {
  if (!init) return {}
  return {
    id: init.id ?? null,
    tenant_id: init.tenant_id ?? null,
    service_type: init.service_type ?? 'MENJADOR',
    contract_type: init.contract_type ?? 'FIXE',
    subtype: init.subtype || '',
    valid_from: init.valid_from ? init.valid_from.substring(0, 10) : '',
    valid_to: init.valid_to ? init.valid_to.substring(0, 10) : '',
    present: toEuros(init.price_present),
    absent: toEuros(init.price_absent),
    justified: toEuros(init.price_justified),
    sporadic: toEuros(init.price_esporadic),
    bc70: init.discount_bc70 ?? null,
    bc100: init.discount_bc100 ?? null
  }
}

function toEuros(cents) { return cents == null ? null : (cents / 100) }
function toCents(euros) { return euros == null ? null : Math.round(Number(euros) * 100) }

function submit() {
  const payload = {
    tenant_id: form.tenant_id,
    service_type: form.service_type,
    contract_type: form.contract_type,
    subtype: form.subtype || null,
    valid_from: form.valid_from || null,
    valid_to: form.valid_to || null,
    price_present: toCents(form.present),
    price_absent: toCents(form.absent),
    price_justified: toCents(form.justified),
    price_esporadic: toCents(form.sporadic),
    discount_bc70: form.bc70,
    discount_bc100: form.bc100,
    is_active: true
  }
  emit('save', payload)
}
</script>
