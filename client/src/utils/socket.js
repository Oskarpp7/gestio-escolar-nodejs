import { io } from 'socket.io-client'
import { useAuthStore } from '@/stores/auth'

let socket

export const initSocketConnection = () => {
  if (socket) return socket
  const auth = useAuthStore()
  socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
    autoConnect: false,
    transports: ['websocket']
  })

  // Inyectar token si existe
  socket.auth = { token: auth.token }

  return socket
}

export const getSocket = () => {
  if (!socket) return initSocketConnection()
  return socket
}
