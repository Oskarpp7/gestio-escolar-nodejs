<template>
  <div>
    <div class="overflow-x-auto">
      <table class="min-w-full divide-y divide-secondary-200">
        <thead class="bg-secondary-50">
          <tr>
            <th class="px-4 py-2 text-left text-xs font-medium text-secondary-500">Servei</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-secondary-500">Contracte</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-secondary-500">Subtipus</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-secondary-500">Present</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-secondary-500">Absent</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-secondary-500">Justificat</th>
            <th class="px-4 py-2 text-left text-xs font-medium text-secondary-500">Esporàdic</th>
            <th class="px-4 py-2"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-secondary-100">
          <tr v-for="row in items" :key="row.id">
            <td class="px-4 py-2">{{ row.service_type }}</td>
            <td class="px-4 py-2">{{ row.contract_type }}</td>
            <td class="px-4 py-2">{{ row.subtype || '-' }}</td>
            <td class="px-4 py-2">{{ formatCurrency(row.price_present) }}</td>
            <td class="px-4 py-2">{{ formatCurrency(row.price_absent) }}</td>
            <td class="px-4 py-2">{{ formatCurrency(row.price_justified) }}</td>
            <td class="px-4 py-2">{{ formatCurrency(row.price_esporadic) }}</td>
            <td class="px-4 py-2 text-right">
              <button class="btn btn-secondary mr-2" @click="$emit('edit', row)">Editar</button>
              <button class="btn btn-danger" @click="$emit('delete', row)">Eliminar</button>
            </td>
          </tr>
          <tr v-if="!items?.length && !loading">
            <td colspan="8" class="px-4 py-8 text-center text-secondary-500">Sense resultats</td>
          </tr>
          <tr v-if="loading">
            <td colspan="8" class="px-4 py-8 text-center text-secondary-500">Carregant...</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center justify-between mt-3">
      <div class="text-sm text-secondary-500">Total: {{ total }}</div>
      <div class="flex items-center gap-2">
        <button class="btn btn-secondary" :disabled="page <= 1" @click="$emit('changePage', page - 1)">Anterior</button>
        <span>Pàgina {{ page }}</span>
        <button class="btn btn-secondary" :disabled="page * limit >= total" @click="$emit('changePage', page + 1)">Següent</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false },
  page: { type: Number, default: 1 },
  limit: { type: Number, default: 20 },
  total: { type: Number, default: 0 }
})

const formatCurrency = (cents) => {
  if (cents == null) return '-'
  return (cents / 100).toFixed(2) + ' €'
}
</script>
