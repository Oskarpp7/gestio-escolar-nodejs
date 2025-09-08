import { defineStore } from 'pinia'
import axios from 'axios'

export const useFamilyStore = defineStore('family', {
  state: () => ({
    children: [],
    weeklyAttendance: {},
    family: {},
    loading: false,
    error: null,
    lastUpdated: null
  }),

  getters: {
    totalChildren: (state) => state.children.length,

    childrenWithAttendance: (state) => {
      return state.children.map(child => ({
        ...child,
        attendance: state.weeklyAttendance[child.id] || []
      }))
    },

    hasData: (state) => state.children.length > 0
  },

  actions: {
    async loadFamilyData () {
      this.loading = true
      this.error = null

      try {
        const response = await axios.get('/api/family/dashboard')

        if (response.data.success) {
          this.children = response.data.data.children || []
          this.weeklyAttendance = response.data.data.weeklyAttendance || {}
          this.family = response.data.data.family || {}
          this.lastUpdated = new Date()
        } else {
          throw new Error(response.data.message || 'Error carregant dades')
        }
      } catch (error) {
        this.error = error.response?.data?.message || 'Error carregant dades família'
        // eslint-disable-next-line no-console
        console.error('Error loading family ', error)
      } finally {
        this.loading = false
      }
    },

    async refreshData () {
      if (!this.loading) {
        await this.loadFamilyData()
      }
    },

    clearData () {
      this.children = []
      this.weeklyAttendance = {}
      this.family = {}
      this.error = null
      this.lastUpdated = null
    }
  }
})
