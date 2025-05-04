<template>
  <div class="editor-header">
    <div class="left">
      <Popover trigger="click" placement="bottom-start" v-model:value="mainMenuVisible">
        <template #content>
          <PopoverMenuItem @click="openAIPPTDialog(); mainMenuVisible = false">AI 生成 PPT</PopoverMenuItem>
          <FileInput accept="application/vnd.openxmlformats-officedocument.presentationml.presentation"  @change="files => {
            importPPTXFile(files)
            mainMenuVisible = false
          }">
            <PopoverMenuItem>导入 pptx 文件（测试版）</PopoverMenuItem>
          </FileInput>
          <FileInput accept=".pptist"  @change="files => {
            importSpecificFile(files)
            mainMenuVisible = false
          }">
            <PopoverMenuItem>导入 pptist 文件</PopoverMenuItem>
          </FileInput>
          <PopoverMenuItem @click="setDialogForExport('pptx')">导出文件</PopoverMenuItem>
          <PopoverMenuItem @click="resetSlides(); mainMenuVisible = false">重置幻灯片</PopoverMenuItem>
          <PopoverMenuItem @click="openMarkupPanel(); mainMenuVisible = false">幻灯片类型标注</PopoverMenuItem>
          <PopoverMenuItem @click="goLink('https://github.com/pipipi-pikachu/PPTist/issues')">意见反馈</PopoverMenuItem>
          <PopoverMenuItem @click="goLink('https://github.com/pipipi-pikachu/PPTist/blob/master/doc/Q&A.md')">常见问题</PopoverMenuItem>
          <PopoverMenuItem @click="mainMenuVisible = false; hotkeyDrawerVisible = true">快捷操作</PopoverMenuItem>
        </template>
        <div class="menu-item"><IconHamburgerButton class="icon" /></div>
      </Popover>

      <div class="title">
        <Input 
          class="title-input" 
          ref="titleInputRef"
          v-model:value="titleValue" 
          @blur="handleUpdateTitle()" 
          v-if="editingTitle" 
        ></Input>
        <div 
          class="title-text"
          @click="startEditTitle()"
          :title="title"
          v-else
        >{{ title }}</div>
      </div>
    </div>

    <div class="right">
      <!-- <div class="group-menu-item">
        <div class="menu-item" v-tooltip="'幻灯片放映（F5）'" @click="enterScreening()">
          <IconPpt class="icon" />
        </div>
        <Popover trigger="click" center>
          <template #content>
            <PopoverMenuItem @click="enterScreeningFromStart()">从头开始</PopoverMenuItem>
            <PopoverMenuItem @click="enterScreening()">从当前页开始</PopoverMenuItem>
          </template>
          <div class="arrow-btn"><IconDown class="arrow" /></div>
        </Popover>
      </div> -->
      <!-- <div class="group-menu-item">
        <div class="menu-item" v-tooltip="'导出为图片'" @click="setDialogForExport('image')">
          <IconImage class="icon" />
        </div>
      </div> -->
      <div class="menu-item" v-tooltip="'AI生成PPT'" @click="openAIPPTDialog(); mainMenuVisible = false">
        <span class="text ai">AI</span>
      </div>
      <!-- <div class="menu-item" v-tooltip="'去发布'" @click="onPublish">
        去发布
      </div> -->
      <div class="menu-item" v-tooltip="'导出'" @click="setDialogForExport('image')">
        <IconDownload class="icon" />
      </div>
      <div class="menu-item" v-tooltip="'保存'" @click="savePresentationToIndexedDB">
        <IconSave class="icon" />
      </div>
      <!-- <a class="github-link" v-tooltip="'Copyright © 2020-PRESENT pipipi-pikachu'" href="https://github.com/pipipi-pikachu/PPTist" target="_blank">
        <div class="menu-item"><IconGithub class="icon" /></div>
      </a> -->
    </div>

    <Drawer
      :width="320"
      v-model:visible="hotkeyDrawerVisible"
      placement="right"
    >
      <HotkeyDoc />
      <template v-slot:title>快捷操作</template>
    </Drawer>

    <FullscreenSpin :loading="exporting" tip="正在导入..." />
  </div>
</template>

<script lang="ts" setup>
import { nextTick, ref, shallowRef } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import useScreening from '@/hooks/useScreening'
import useImport from '@/hooks/useImport'
import useSlideHandler from '@/hooks/useSlideHandler'
import useExport from '@/hooks/useExport'
import type { DialogForExportTypes } from '@/types/export'
import { Upload as IconUpload, Save as IconSave } from '@icon-park/vue-next'

declare const chrome: any;

import HotkeyDoc from './HotkeyDoc.vue'
import FileInput from '@/components/FileInput.vue'
import FullscreenSpin from '@/components/FullscreenSpin.vue'
import Drawer from '@/components/Drawer.vue'
import Input from '@/components/Input.vue'
import Popover from '@/components/Popover.vue'
import PopoverMenuItem from '@/components/PopoverMenuItem.vue'
import ExportImage from '../ExportDialog/ExportImage.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { title } = storeToRefs(slidesStore)
const { enterScreening, enterScreeningFromStart } = useScreening()
const { importSpecificFile, importPPTXFile, exporting } = useImport()
const { resetSlides } = useSlideHandler()
const { exportSingleImage } = useExport()

const mainMenuVisible = ref(false)
const hotkeyDrawerVisible = ref(false)
const editingTitle = ref(false)
const titleInputRef = ref<InstanceType<typeof Input>>()
const titleValue = ref('')

// 导出组件实例
const exportImageRef = shallowRef<InstanceType<typeof ExportImage>>()

const startEditTitle = () => {
  titleValue.value = title.value
  editingTitle.value = true
  nextTick(() => titleInputRef.value?.focus())
}

const handleUpdateTitle = () => {
  slidesStore.setTitle(titleValue.value)
  editingTitle.value = false
}

const goLink = (url: string) => {
  window.open(url)
  mainMenuVisible.value = false
}

const setDialogForExport = (type: DialogForExportTypes) => {
  mainStore.setDialogForExport(type)
  mainMenuVisible.value = false
}

const openMarkupPanel = () => {
  mainStore.setMarkupPanelState(true)
}

const openAIPPTDialog = () => {
  mainStore.setAIPPTDialogState(true)
}

async function onPublish() {
  try {
    // 检查是否安装了插件
    if (!window.pptistXHSHelper?.isInstalled) {
      alert('请先安装小红书发布助手插件')
      return
    }

    console.log('正在准备发布...')
    
    // 显示加载状态
    const loadingEl = document.createElement('div')
    loadingEl.className = 'xhs-exporting-mask'
    loadingEl.innerHTML = '<div class="spinner"></div><div class="text">正在导出并发布到小红书...</div>'
    loadingEl.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);color:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center;z-index:9999;'
    document.body.appendChild(loadingEl)
    
    try {
      // 使用插件的 Promise-based API
      console.log('调用 pptistXHSHelper.publish...')
      await window.pptistXHSHelper.publish({
        images: ['data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg=='],
        title: title.value || 'Test Title'
      })
      
      alert('发布成功！')
    } finally {
      // 移除加载元素
      loadingEl.remove()
    }
  } catch (error) {
    console.error('发布失败:', error)
    alert('发布失败，请稍后重试')
  }
}

const generatePicId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Fallback to localStorage for testing
const saveToLocalStorage = (picId: string, data: any) => {
  try {
    console.log('Saving presentation to localStorage with ID:', picId)
    const serializedData = JSON.stringify(data)
    localStorage.setItem(`pptist-presentation-${picId}`, serializedData)
    return true
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
    return false
  }
}

// Get presentation from localStorage
const getFromLocalStorage = (picId: string) => {
  try {
    const data = localStorage.getItem(`pptist-presentation-${picId}`)
    if (data) {
      return JSON.parse(data)
    }
    return null
  } catch (error) {
    console.error('Failed to get from localStorage:', error)
    return null
  }
}

const savePresentationToIndexedDB = async () => {
  try {
    // Generate a unique picture ID
    const picId = generatePicId()
    console.log('Generated picId:', picId)
    
    // Create a deep clone of slides to remove non-serializable objects
    console.log('Creating serialized copies of slides and theme data...')
    const serializedSlides = JSON.parse(JSON.stringify(slidesStore.slides))
    const serializedTheme = JSON.parse(JSON.stringify(slidesStore.theme))
    
    // Create the presentation data object with serialized data
    const presentationData = {
      id: picId,
      title: title.value,
      slides: serializedSlides,
      theme: serializedTheme,
      timestamp: new Date().getTime()
    }
    console.log('Prepared presentation data for storage')
    
    // For testing, try saving to localStorage first
    const savedToLocalStorage = saveToLocalStorage(picId, presentationData)
    
    let savedSuccessfully = false
    
    // Use a promise-based approach for IndexedDB operations
    try {
      await new Promise<void>((resolve, reject) => {
        // Open IndexedDB
        console.log('Opening IndexedDB database...')
        const request = indexedDB.open('pptist-presentations', 1)
        
        // Handle database setup
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          console.log('Database upgrade needed, creating object store...')
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains('presentations')) {
            db.createObjectStore('presentations', { keyPath: 'id' })
          }
        }
        
        // Handle database open success
        request.onsuccess = (event: Event) => {
          console.log('Database opened successfully')
          const db = (event.target as IDBOpenDBRequest).result
          
          try {
            console.log('Creating transaction...')
            const transaction = db.transaction(['presentations'], 'readwrite')
            const store = transaction.objectStore('presentations')
            
            // Save the presentation data
            console.log('Storing presentation data...')
            const saveRequest = store.put(presentationData)
            
            saveRequest.onsuccess = () => {
              console.log('Presentation saved successfully with ID:', picId)
              savedSuccessfully = true
              resolve()
            }
            
            saveRequest.onerror = (event) => {
              console.error('保存失败 (IndexedDB):', saveRequest.error)
              console.error('Error event:', event)
              reject(saveRequest.error)
            }
            
            transaction.oncomplete = () => {
              console.log('Transaction completed')
              db.close()
            }
            
            transaction.onerror = () => {
              console.error('Transaction error:', transaction.error)
              reject(transaction.error)
            }
          } catch (err) {
            console.error('Error during database transaction:', err)
            reject(err)
          }
        }
        
        // Handle database open error
        request.onerror = () => {
          console.error('Failed to open database:', request.error)
          reject(request.error)
        }
      })
    } catch (dbError) {
      console.error('IndexedDB operation failed:', dbError)
      if (!savedToLocalStorage) {
        throw new Error('Failed to save presentation (both IndexedDB and localStorage failed)')
      }
    }
    
    // Show success message with fallback to localStorage if needed
    const shareUrl = `${window.location.origin}/pic?id=${picId}`
    const storageType = savedSuccessfully ? 'IndexedDB' : 'localStorage'
    
    // Show success message
    alert(`保存成功！(使用${storageType})\n分享链接: ${shareUrl}`)
    
    // Copy URL to clipboard
    navigator.clipboard.writeText(shareUrl)
      .then(() => console.log('URL已复制到剪贴板'))
      .catch(err => console.error('无法复制URL:', err))
    
  } catch (error: unknown) {
    console.error('保存失败:', error)
    alert(`保存失败: ${error instanceof Error ? error.message : '请稍后重试'}`)
  }
}
</script>

<style lang="scss" scoped>
.editor-header {
  background-color: #fff;
  user-select: none;
  border-bottom: 1px solid $borderColor;
  display: flex;
  justify-content: space-between;
  padding: 0 5px;
}
.left, .right {
  display: flex;
  justify-content: center;
  align-items: center;
}
.menu-item {
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  padding: 0 10px;
  border-radius: $borderRadius;
  cursor: pointer;

  .icon {
    font-size: 18px;
    color: #666;
  }
  .text {
    width: 18px;
    text-align: center;
    font-size: 17px;
  }
  .ai {
    background: linear-gradient(270deg, #d897fd, #33bcfc);
    background-clip: text;
    color: transparent;
    font-weight: 700;
  }

  &:hover {
    background-color: #f1f1f1;
  }
}
.group-menu-item {
  height: 30px;
  display: flex;
  margin: 0 8px;
  padding: 0 2px;
  border-radius: $borderRadius;

  &:hover {
    background-color: #f1f1f1;
  }

  .menu-item {
    padding: 0 3px;
  }
  .arrow-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
  }
}
.title {
  height: 30px;
  margin-left: 2px;
  font-size: 13px;

  .title-input {
    width: 200px;
    height: 100%;
    padding-left: 0;
    padding-right: 0;

    ::v-deep(input) {
      height: 28px;
      line-height: 28px;
    }
  }
  .title-text {
    min-width: 20px;
    max-width: 400px;
    line-height: 30px;
    padding: 0 6px;
    border-radius: $borderRadius;
    cursor: pointer;

    @include ellipsis-oneline();

    &:hover {
      background-color: #f1f1f1;
    }
  }
}
.github-link {
  display: inline-block;
  height: 30px;
}
</style>