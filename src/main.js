import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'tailwindcss/tailwind.css'
// import VueSignalR from '@latelier/vue-signalr'

const app = createApp(App).use(router)
// app.use(VueSignalR, 'https://localhost:5001/meetinghub')
app.mount('#app')
