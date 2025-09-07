<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Router View Principal -->
    <router-view v-slot="{ Component, route }">
      <transition
        :name="route.meta.transition || 'fade'"
        mode="out-in"
        appear
      >
        <component 
          :is="Component" 
          :key="route.fullPath"
          class="min-h-screen"
        />
      </transition>
    </router-view>
    
    <!-- Global Loading Overlay -->
    <GlobalLoading />
    
    <!-- Global Modals -->
    <GlobalModals />
    
    <!-- Socket Connection Status -->
    <SocketStatus />
    
    <!-- PWA Update Prompt -->
    <PWAUpdatePrompt />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTenantStore } from '@/stores/tenant'
import { useSocketStore } from '@/stores/socket'
import { useThemeStore } from '@/stores/theme'

// Components globals (lazy load)
import GlobalLoading from '@/components/common/GlobalLoading.vue'
import GlobalModals from '@/components/common/GlobalModals.vue'
import SocketStatus from '@/components/common/SocketStatus.vue'
import PWAUpdatePrompt from '@/components/common/PWAUpdatePrompt.vue'

const router = useRouter()
const authStore = useAuthStore()
const tenantStore = useTenantStore()
const socketStore = useSocketStore()
const themeStore = useThemeStore()

// Inicialització de l'app
onMounted(async () => {
  console.log('🚀 App Vue muntada')
  
  // Aplicar tema inicial
  themeStore.initTheme()
  
  // Intentar restaurar sessió des de localStorage
  try {
    await authStore.restoreSession()
    
    // Si hi ha usuari autenticat, connectar socket
    if (authStore.isAuthenticated) {
      socketStore.connect()
    }
  } catch (error) {
    console.error('Error restaurant sessió:', error)
  }
  
  // Configurar listeners globals
  setupGlobalListeners()
  
  // Configurar service worker updates
  setupPWAUpdates()
})

onUnmounted(() => {
  // Cleanup global listeners
  cleanupGlobalListeners()
  
  // Desconnectar socket
  socketStore.disconnect()
})

// Watch per canvis d'autenticació
watch(
  () => authStore.isAuthenticated,
  (isAuthenticated) => {
    if (isAuthenticated) {
      // Usuari s'ha autenticat
      socketStore.connect()
    } else {
      // Usuari s'ha desautenticat
      socketStore.disconnect()
      tenantStore.clearTenant()
      
      // Redirect a login si no és una ruta pública
      if (!router.currentRoute.value.meta.public) {
        router.push('/login')
      }
    }
  }
)

// Configurar listeners globals
const setupGlobalListeners = () => {
  // Gestió d'errors globals
  window.addEventListener('error', handleGlobalError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
  
  // Network status
  window.addEventListener('online', handleOnline)
  window.addEventListener('offline', handleOffline)
  
  // Gestió de focus per actualitzar dades
  window.addEventListener('focus', handleWindowFocus)
  
  // Gestió de tecles globals
  document.addEventListener('keydown', handleGlobalKeydown)
}

const cleanupGlobalListeners = () => {
  window.removeEventListener('error', handleGlobalError)
  window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  window.removeEventListener('online', handleOnline)
  window.removeEventListener('offline', handleOffline)
  window.removeEventListener('focus', handleWindowFocus)
  document.removeEventListener('keydown', handleGlobalKeydown)
}

// Handlers globals
const handleGlobalError = (event) => {
  console.error('Error global captat:', event.error)
  // TODO: Enviar a servei de monitoring
}

const handleUnhandledRejection = (event) => {
  console.error('Promise rejection no gestionada:', event.reason)
  // TODO: Enviar a servei de monitoring
}

const handleOnline = () => {
  console.log('📶 Connexió restaurada')
  // Reconnectar socket si cal
  if (authStore.isAuthenticated && !socketStore.isConnected) {
    socketStore.connect()
  }
}

const handleOffline = () => {
  console.log('📶 Connexió perduda')
}

const handleWindowFocus = () => {
  // Actualitzar dades quan l'usuari torna a la pestanya
  if (authStore.isAuthenticated) {
    authStore.refreshUserData()
  }
}

const handleGlobalKeydown = (event) => {
  // Escape per tancar modals
  if (event.key === 'Escape') {
    // TODO: Implementar tancament de modals globals
  }
  
  // Cmd/Ctrl + K per obrir search
  if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
    event.preventDefault()
    // TODO: Obrir search global
  }
}

// PWA Updates
const setupPWAUpdates = () => {
  // TODO: Implementar lògica de PWA updates
}
</script>

<style>
/* Transitions globals */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.3s ease;
}

.slide-right-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(30px);
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(30px);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-30px);
  opacity: 0;
}

/* Scrollbar personalitzada */
.ps__rail-y {
  width: 6px !important;
  background-color: transparent !important;
  opacity: 0 !important;
  transition: opacity 0.3s !important;
}

.ps__rail-y:hover,
.ps--clicking .ps__rail-y {
  opacity: 0.6 !important;
}

.ps__thumb-y {
  background-color: #cbd5e1 !important;
  border-radius: 3px !important;
  width: 6px !important;
  right: 0 !important;
}

.ps__thumb-y:hover {
  background-color: #94a3b8 !important;
}

/* Safari specific fixes */
@supports (-webkit-appearance: none) {
  .form-input,
  .form-textarea,
  .form-select {
    -webkit-appearance: none;
  }
}

/* Print styles */
@media print {
  .no-print {
    display: none !important;
  }
  
  .print-break-before {
    page-break-before: always;
  }
  
  .print-break-after {
    page-break-after: always;
  }
}

/* Animation performance */
* {
  -webkit-backface-visibility: hidden;
  -webkit-transform-style: preserve-3d;
}

/* Focus visible per accessibilitat */
.focus-visible:focus {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Loading states */
.loading-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: .5;
  }
}
</style>
