<template>
  <router-view v-if="!isInitializing && slides.length" />
  <FullscreenSpin :tip="loadingMessage" v-else loading :mask="false" />
</template>

<script lang="ts" setup>
import { onMounted, ref, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useScreenStore, useMainStore, useSnapshotStore, useSlidesStore } from '@/store'
import { useProjectStore } from '@/store/projects'
import { LOCALSTORAGE_KEY_DISCARDED_DB, LOCALSTORAGE_KEY_SLIDES } from '@/configs/storage'
import { deleteDiscardedDB } from '@/utils/database'
import { isPC } from '@/utils/common'
import type { Slide } from '@/types/slides'
import message from './utils/message'
import api from '@/services'

import Editor from './views/Editor/index.vue'
import Screen from './views/Screen/index.vue'
import Mobile from './views/Mobile/index.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'

const _isPC = isPC()

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const projectStore = useProjectStore()
const snapshotStore = useSnapshotStore()
const { databaseId } = storeToRefs(mainStore)
const { slides } = storeToRefs(slidesStore)
const { screening } = storeToRefs(useScreenStore())

// Track initialization state
const isInitializing = ref(true)
const initStage = ref('database')

// Compute loading message based on current stage
const loadingMessage = computed(() => {
  if (initStage.value === 'database') return '数据库初始化中，请稍等...'
  if (initStage.value === 'slides') return '幻灯片数据加载中，请稍等...'
  if (initStage.value === 'templates') return '模板加载中，请稍等...'
  return '数据初始化中，请稍等...'
})

if (import.meta.env.MODE !== 'development') {
  window.onbeforeunload = () => false
}

onMounted(async () => {
  try {
    // 初始化数据库
    console.log('[App] Starting database initialization')
    initStage.value = 'database'
    // Force project store initialization which will initialize the database
    await projectStore.fetchProjects()
    console.log('[App] Database initialization completed')
    
    // 加载幻灯片数据
    console.log('[App] Loading slides data')
    initStage.value = 'slides'
    // 初始化 IndexedDB 并加载数据
    await slidesStore.initFromStorage()
    console.log('[App] Slides data loaded')
    
    // 如果没有数据，则从服务器加载
    if (slidesStore.slides.length === 0) {
      console.log('[App] No slides data found, loading from server')
      const slides = await api.getMockData('slides')
      slidesStore.setSlides(slides)
      console.log('[App] Loaded slides data from server')
    } 
    else {
      console.log('[App] Using existing slides data')
    }
    
    // 加载模板
    console.log('[App] Loading templates')
    initStage.value = 'templates'
    
    // Skip template loading for now to fix the blocking issue
    console.log('[App] Skipping template loading to avoid blocking')
    isInitializing.value = false
    console.log('[App] Initialization completed')
    
    // Load templates in the background (don't await)
    slidesStore.loadTemplatesFromServer()
      .then(() => console.log('[App] Templates loaded in background'))
      .catch(err => console.error('[App] Background template loading failed:', err))
      
    /*
    // This code is temporarily disabled to fix the blocking issue
    try {
      const templateLoadPromise = slidesStore.loadTemplatesFromServer()
      
      // Set a timeout to continue even if template loading takes too long
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          console.log('[App] Template loading timeout, continuing...')
          resolve()
        }, 5000) // 5 seconds timeout
      })
      
      // Wait for either the templates to load or the timeout
      await Promise.race([templateLoadPromise, timeoutPromise])
      console.log('[App] Templates loaded or skipped due to timeout')
    } 
    catch (error) {
      console.error('[App] Failed to load templates:', error)
      // Continue initialization despite template loading failure
    }
    */
  } 
  catch (error) {
    console.error('[App] Initialization failed:', error)
    message.error('初始化失败，请刷新页面重试', { duration: 5000, closable: true })
  } 
  finally {
    // Complete initialization
    console.log('[App] Initialization completed')
    isInitializing.value = false
  }

  await deleteDiscardedDB()
  snapshotStore.initSnapshotDatabase()
})

// 应用注销时向 localStorage 中记录下本次 indexedDB 的数据库ID，用于之后清除数据库
window.addEventListener('unload', () => {
  const discardedDB = localStorage.getItem(LOCALSTORAGE_KEY_DISCARDED_DB)
  const discardedDBList: string[] = discardedDB ? JSON.parse(discardedDB) : []

  discardedDBList.push(databaseId.value)

  const newDiscardedDB = JSON.stringify(discardedDBList)
  localStorage.setItem(LOCALSTORAGE_KEY_DISCARDED_DB, newDiscardedDB)
})
</script>

<style lang="scss">
#app {
  height: 100%;
}
</style>