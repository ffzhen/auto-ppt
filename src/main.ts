import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'

import '@icon-park/vue-next/styles/index.css'
import 'prosemirror-view/style/prosemirror.css'
import 'animate.css'
import '@/assets/styles/prosemirror.scss'
import '@/assets/styles/global.scss'
import '@/assets/styles/font.scss'
import '@/assets/styles/tailwind.css'

import Icon from '@/plugins/icon'
import Directive from '@/plugins/directive'

const app = createApp(App)
app.use(ElementPlus)
app.use(Icon)
app.use(Directive)
app.use(createPinia())
app.use(router)
app.mount('#app')
