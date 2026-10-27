import { defineStore } from 'pinia'
import { ref } from 'vue'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface ToastState {
  id: number
  message: string
  tone: ToastTone
}

export const useUiStore = defineStore('ui', () => {
  const toast = ref<ToastState | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  function dismiss() {
    if (timer) {
      clearTimeout(timer)
      timer = undefined
    }
    toast.value = null
  }

  function notify(message: string, tone: ToastTone = 'info', duration = 3000) {
    dismiss()
    toast.value = {
      id: Date.now(),
      message,
      tone,
    }

    if (duration > 0) {
      timer = setTimeout(dismiss, duration)
    }
  }

  return {
    toast,
    notify,
    dismiss,
  }
})
