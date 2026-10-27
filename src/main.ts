import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import './assets/main.css'

import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import router from './router'
import { usePwaStore } from './stores/pwa'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const pwa = usePwaStore(pinia)
pwa.initialize()

if (import.meta.env.PROD) {
  pwa.registerServiceWorker(registerSW)
}

app.mount('#app')
