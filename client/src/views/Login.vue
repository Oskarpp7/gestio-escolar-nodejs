<template>
  <div class="min-h-screen flex items-center justify-center bg-secondary-50">
    <div class="card w-full max-w-sm">
      <h1 class="card-title">Iniciar sessió</h1>
      <form @submit.prevent="handleLogin" class="space-y-3">
        <div>
          <label class="label">Email</label>
          <input v-model="email" type="email" class="input" required />
        </div>
        <div>
          <label class="label">Contrasenya</label>
          <input v-model="password" type="password" class="input" required />
        </div>
        <button type="submit" class="btn btn-primary w-full">Entrar</button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const email = ref('admin@example.com')
const password = ref('password')
const router = useRouter()
const auth = useAuthStore()

const handleLogin = async () => {
  await auth.login(email.value, password.value)
  router.push({ name: 'dashboard' })
}
</script>
