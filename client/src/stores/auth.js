import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null
  }),
  getters: {
    isAuthenticated: (state) => !!state.token
  },
  actions: {
    async login(_email, _password) {
      // TODO: Implementar login real
      this.user = { id: 1, name: 'Admin', role: 'SUPER_ADMIN' }
      this.token = 'dev-token'
      localStorage.setItem('token', this.token)
      localStorage.setItem('user', JSON.stringify(this.user))
    },
    async logout() {
      this.user = null
      this.token = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    },
    async restoreSession() {
      const token = localStorage.getItem('token')
      const user = localStorage.getItem('user')
      if (token && user) {
        this.token = token
        this.user = JSON.parse(user)
      }
    },
    async refreshUserData() {
      // TODO: Fetch dades usuari
      return true
    }
  }
})
