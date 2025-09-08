import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({ dark: false }),
  actions: {
    initTheme() {
      this.dark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', this.dark)
    }
  }
})
