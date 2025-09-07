import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import i18n from './i18n'
import Toast, { POSITION } from 'vue-toastification'
import PerfectScrollbar from 'vue3-perfect-scrollbar'
import FloatingVue from 'floating-vue'

import App from './App.vue'

// Styles
import './assets/css/main.css'
import 'vue-toastification/dist/index.css'
import 'vue3-perfect-scrollbar/dist/vue3-perfect-scrollbar.css'
import 'floating-vue/dist/style.css'

// Utils i plugins
import { setupAxiosInterceptors } from './api/axios'
import { initSocketConnection } from './utils/socket'

// Crear app
const app = createApp(App)
const pinia = createPinia()

// Configurar Pinia
app.use(pinia)

// Configurar router
app.use(router)

// Configurar i18n
app.use(i18n)

// Configurar toast notifications
app.use(Toast, {
  position: POSITION.TOP_RIGHT,
  timeout: 5000,
  closeOnClick: true,
  pauseOnFocusLoss: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
  showCloseButtonOnHover: false,
  hideProgressBar: false,
  closeButton: "button",
  icon: true,
  rtl: false,
  newestOnTop: true,
  maxToasts: 5,
  transition: "Vue-Toastification__slideBlurred"
})

// Configurar perfect scrollbar
app.use(PerfectScrollbar)

// Configurar floating Vue (tooltips, popovers)
app.use(FloatingVue, {
  themes: {
    'tooltip': {
      $extend: 'tooltip',
      triggers: ['hover', 'focus', 'touch'],
      autoHide: true,
      delay: {
        show: 200,
        hide: 0
      }
    },
    'dropdown': {
      $extend: 'dropdown',
      triggers: ['click'],
      autoHide: true,
      placement: 'bottom-start'
    }
  }
})

// Configurar interceptors d'Axios
setupAxiosInterceptors()

// Global error handler
app.config.errorHandler = (err, instance, info) => {
  console.error('Error global Vue:', err)
  console.error('Component instance:', instance)
  console.error('Error info:', info)
  
  // TODO: Enviar error a servei de monitoring (Sentry, etc.)
}

// Performance measurement
if (process.env.NODE_ENV === 'development') {
  app.config.performance = true
}

// Mount app
app.mount('#app')

// Marcar com carregada per amagar loading inicial
document.body.classList.add('app-loaded')

// Inicialitzar connexió Socket.io després del mount
// (es farà quan l'usuari es loggei)

// Log de l'entorn
console.log(`🚀 MouT Serveis Client iniciada`)
console.log(`📦 Entorn: ${import.meta.env.MODE}`)
console.log(`🌐 API URL: ${import.meta.env.VITE_API_URL || 'http://localhost:3000'}`)

// Hot reload per desenvolupament
if (import.meta.hot) {
  import.meta.hot.accept()
}

export default app
