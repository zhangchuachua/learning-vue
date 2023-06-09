import { createApp } from 'vue'
import { createPinia } from 'pinia'
import axios from '@/utils/axios'
import 'element-plus/es/components/message/style/css' // this is only needed if the page also used ElMessage

import App from './App.vue'
import router from './router'

import './assets/main.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'uno.css'

const app = createApp(App)

// vue3 不推荐使用 prototype 进行挂载, 可以使用 app.config.globalProperties
app.config.globalProperties.$http = axios

app.use(createPinia())
app.use(router)

app.mount('#app')
