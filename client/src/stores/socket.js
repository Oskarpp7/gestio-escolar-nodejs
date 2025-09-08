import { defineStore } from 'pinia'
import { getSocket, initSocketConnection } from '@/utils/socket'

export const useSocketStore = defineStore('socket', {
  state: () => ({ isConnected: false }),
  actions: {
    connect() {
      const socket = initSocketConnection()
      if (this.isConnected) return
      socket.connect()
      socket.on('connect', () => { this.isConnected = true })
      socket.on('disconnect', () => { this.isConnected = false })
    },
    disconnect() {
      const socket = getSocket()
      if (socket && this.isConnected) {
        socket.disconnect()
        this.isConnected = false
      }
    }
  }
})
