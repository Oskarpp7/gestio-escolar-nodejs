<template>
  <transition name="fade">
    <div v-if="loading" class="fixed inset-0 bg-black/30 backdrop-blur-xs flex items-center justify-center z-50">
      <div class="bg-white dark:bg-secondary-800 rounded-lg shadow-lg p-6 flex items-center gap-3">
        <svg class="animate-spin h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
        </svg>
        <span class="text-secondary-700 dark:text-secondary-200 text-sm">Carregant...</span>
      </div>
    </div>
  </transition>
  </template>

<script setup>
import { ref } from 'vue'
// Placeholder simple. Es pot connectar a un store global de loading.
const loading = ref(false)
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity .2s }
.fade-enter-from, .fade-leave-to { opacity: 0 }
</style>
