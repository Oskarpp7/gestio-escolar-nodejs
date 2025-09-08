<template>
  <div class="fixed bottom-3 right-3">
    <div :class="['rounded-full px-3 py-1 text-xs shadow', isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700']">
      {{ isConnected ? 'Socket connectat' : 'Socket desconnectat' }}
    </div>
  </div>
  </template>

<script setup>
import { storeToRefs } from 'pinia'
import { useSocketStore } from '@/stores/socket'

const socketStore = useSocketStore()
const { isConnected } = storeToRefs(socketStore)
</script>
