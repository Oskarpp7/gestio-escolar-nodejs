import { defineStore } from 'pinia'
import { getApi } from '@/api/axios'

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    currentTenantId: null,
    tenants: []
  }),
  actions: {
    setTenant(id) { 
      this.currentTenantId = id 
      if (id) localStorage.setItem('tenant_id', String(id))
      else localStorage.removeItem('tenant_id')
    },
    clearTenant() { this.currentTenantId = null },
    async fetchTenants() {
      const api = getApi()
      const { data } = await api.get('/api/tenant/list')
      this.tenants = data?.data || []
      // Restaurar selecció si existeix
      const saved = localStorage.getItem('tenant_id')
      if (saved && !this.currentTenantId) {
        const exists = this.tenants.find(t => String(t.id) === String(saved))
        if (exists) this.currentTenantId = exists.id
      }
    }
  }
})
