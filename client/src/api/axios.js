import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

let axiosInstance

export const getApi = () => {
  if (axiosInstance) return axiosInstance
  axiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    withCredentials: false,
    timeout: 15000
  })

  // Request interceptor
  axiosInstance.interceptors.request.use((config) => {
    const auth = useAuthStore()
    if (auth.token) {
      config.headers.Authorization = `Bearer ${auth.token}`
    }
    return config
  })

  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status
      if (status === 401) {
        const auth = useAuthStore()
        auth.logout()
      }
      return Promise.reject(error)
    }
  )

  return axiosInstance
}

export const setupAxiosInterceptors = () => {
  getApi()
}
