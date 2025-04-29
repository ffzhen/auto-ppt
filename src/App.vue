<template>
  <router-view v-if="slides.length" />
  <FullscreenSpin tip="数据初始化中，请稍等 ..." v-else loading :mask="false" />
</template>



<script lang="ts" setup>
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useScreenStore, useMainStore, useSnapshotStore, useSlidesStore } from '@/store'
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
const snapshotStore = useSnapshotStore()
const { databaseId } = storeToRefs(mainStore)
const { slides } = storeToRefs(slidesStore)
const { screening } = storeToRefs(useScreenStore())

if (import.meta.env.MODE !== 'development') {
  window.onbeforeunload = () => false
}

onMounted(async () => {
  try {
    // 初始化 IndexedDB 并加载数据
    await slidesStore.initFromStorage()
    
    // 如果没有数据，则从服务器加载
    if (slidesStore.slides.length === 0) {
      const slides = await api.getMockData('slides')
      slidesStore.setSlides(slides)
      console.log('从服务器加载幻灯片数据成功')
    }
    
    // 加载模板
    try {
      await slidesStore.loadTemplatesFromServer()
      console.log('模板加载成功')
    } catch (error) {
      console.error('加载模板失败:', error)
    }
  } catch (error) {
    console.error('初始化失败:', error)
    message.error('初始化失败，请刷新页面重试', { duration: 5000, closable: true })
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