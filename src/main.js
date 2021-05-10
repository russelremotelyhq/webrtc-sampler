import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'tailwindcss/tailwind.css'
import AudioVisual from 'vue-audio-visual'
const app = createApp(App).use(router)
app.use(AudioVisual)
app.mount('#app')
