<template>
  <div class="pic-viewer">
    <div v-if="loading" class="loading-container">
      <div class="spinner"></div>
      <div class="loading-text">正在加载演示文稿...</div>
    </div>
    
    <div v-else-if="error" class="error-container">
      <div class="error-icon">!</div>
      <div class="error-title">找不到演示文稿</div>
      <div class="error-message">{{ error }}</div>
      <button class="back-button" @click="goHome">返回首页</button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMainStore, useSlidesStore } from '@/store'

const route = useRoute()
const router = useRouter()
const slidesStore = useSlidesStore()
const mainStore = useMainStore()

const loading = ref(true)
const error = ref('')

// Define the presentation data interface
interface PresentationData {
  id: string
  title: string
  slides: any[] // Using any for now as the Slides type may be complex
  theme: any
  timestamp: number
}

// Fix the loadPresentationFromIndexedDB function
const loadPresentationFromIndexedDB = async (picId: string): Promise<PresentationData> => {
  return await new Promise((resolve, reject) => {
    const request = indexedDB.open('pptist-presentations', 1)
    
    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('presentations')) {
        db.createObjectStore('presentations', { keyPath: 'id' })
      }
    }
    
    request.onsuccess = (event: Event) => {
      const db = (event.target as IDBOpenDBRequest).result
      const transaction = db.transaction(['presentations'], 'readonly')
      const store = transaction.objectStore('presentations')
      
      const getRequest = store.get(picId)
      
      getRequest.onsuccess = () => {
        if (getRequest.result) {
          resolve(getRequest.result as PresentationData)
        } 
        else {
          reject(new Error('演示文稿不存在或已被删除'))
        }
      }
      
      getRequest.onerror = () => {
        reject(new Error('读取数据时发生错误'))
      }
      
      transaction.oncomplete = () => {
        db.close()
      }
    }
    
    request.onerror = () => {
      reject(new Error('无法打开数据库'))
    }
  })
}

const goHome = () => {
  router.push('/')
}

onMounted(async () => {
  try {
    const picId = route.query.id
    
    if (!picId || typeof picId !== 'string') {
      error.value = '无效的演示文稿ID'
      loading.value = false
      return
    }
    
    const presentationData = await loadPresentationFromIndexedDB(picId)
    
    // Update the store with the presentation data
    if (presentationData.slides) {
      slidesStore.setSlides(presentationData.slides)
    }
    
    if (presentationData.theme) {
      slidesStore.setTheme(presentationData.theme)
    }
    
    if (presentationData.title) {
      slidesStore.setTitle(presentationData.title)
    }
    
    // Redirect to editor with the loaded presentation
    router.replace('/')
  } 
  catch (err: unknown) {
    if (err instanceof Error) {
      error.value = err.message
    } 
    else {
      error.value = '加载演示文稿时发生未知错误'
    }
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.pic-viewer {
  width: 100%;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f9f9f9;
}

.loading-container, 
.error-container {
  text-align: center;
  padding: 20px;
  max-width: 500px;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 20px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #4b89dc;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-text {
  font-size: 18px;
  color: #666;
}

.error-icon {
  width: 64px;
  height: 64px;
  line-height: 64px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background-color: #ff6b6b;
  color: white;
  font-size: 40px;
  font-weight: bold;
}

.error-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #333;
}

.error-message {
  font-size: 16px;
  color: #666;
  margin-bottom: 20px;
}

.back-button {
  background-color: #4b89dc;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:hover {
    background-color: #3b7dd8;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style> 