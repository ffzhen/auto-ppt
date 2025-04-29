import { createRouter, createWebHistory } from 'vue-router'
import ImageGeneratorTest from '@/views/ImageGeneratorTest.vue'

const routes = [
  {
    path: '/',
    name: 'editor',
    component: () => import('@/views/Editor/index.vue')
  },
  {
    path: '/screen',
    name: 'screen',
    component: () => import('@/views/Screen/index.vue')
  },
  {
    path: '/mobile',
    name: 'mobile',
    component: () => import('@/views/Mobile/index.vue')
  },
  {
    path: '/image-test',
    name: 'image-test',
    component: ImageGeneratorTest
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 