import { getApi } from './axios'

export async function getEffectivePricing(tenantId) {
  const api = getApi()
  const { data } = await api.get(`/api/pricing/tenant/${tenantId}`)
  return data
}

export async function listPricingConfigs({ page = 1, limit = 20, tenantId } = {}) {
  const api = getApi()
  const params = { page, limit }
  if (tenantId) params.tenant_id = tenantId
  const { data } = await api.get('/api/pricing', { params })
  return data
}

export async function createPricingConfig(payload) {
  const api = getApi()
  const { data } = await api.post('/api/pricing', payload)
  return data
}

export async function updatePricingConfig(id, payload) {
  const api = getApi()
  const { data } = await api.put(`/api/pricing/${id}`, payload)
  return data
}

export async function deletePricingConfig(id) {
  const api = getApi()
  const { data } = await api.delete(`/api/pricing/${id}`)
  return data
}
