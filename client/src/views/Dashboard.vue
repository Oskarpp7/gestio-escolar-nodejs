<template>
  <div class="p-6 max-w-7xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">Panell</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="card">
        <div class="card-title">Administració</div>
        <router-link class="btn btn-secondary" :to="{ name: 'admin-pricing' }">Configuració de preus</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
// Dashboard simple
</script>
