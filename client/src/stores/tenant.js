import { defineStore } from 'pinia'

export const useTenantStore = defineStore('tenant', {
  state: () => ({
    currentTenantId: null,
    tenants: []
  }),
  actions: {
    setTenant(id) { this.currentTenantId = id },
    clearTenant() { this.currentTenantId = null },
    async fetchTenants() {
      // TODO: carregar llista de centres del backend
      this.tenants = [
        { id: 1, name: 'Centre A' },
        { id: 2, name: 'Centre B' }
      ]
    }
  }
})
