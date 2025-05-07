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

      <div class="nav-button" v-tooltip="'返回项目列表'" @click="goToProjectList()">
        <IconBack class="icon" />
        <span class="button-text">返回列表</span>
      </div>

      <div class="nav-button" v-tooltip="'新建项目'" @click="createNewProject()">
        <IconAdd class="icon" />
        <span class="button-text">新建项目</span>
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
      <div class="save-status" v-tooltip="lastSavedTimeFormatted">
        <IconDone class="icon" v-if="savedStatus === 'saved'" />
        <IconLoading class="icon rotating" v-else />
        <span class="status-text">{{ savedStatus === 'saved' ? '已保存' : '保存中...' }}</span>
      </div>
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
import { nextTick, ref, shallowRef, computed, watch, onMounted } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import { useProjectStore } from '@/store/projects'
import useScreening from '@/hooks/useScreening'
import useImport from '@/hooks/useImport'
import useSlideHandler from '@/hooks/useSlideHandler'
import useExport from '@/hooks/useExport'
import type { DialogForExportTypes } from '@/types/export'
import { 
  Upload as IconUpload, 
  Save as IconSave, 
  Back as IconBack, 
  Add as IconAdd,
  Loading as IconLoading,
  DoneAll as IconDone
} from '@icon-park/vue-next'
import { useRouter, useRoute } from 'vue-router'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

// Safe type declaration for Chrome API
declare let chrome: any

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
const { title, slides, theme } = storeToRefs(slidesStore)
const { enterScreening, enterScreeningFromStart } = useScreening()
const { importSpecificFile, importPPTXFile, exporting } = useImport()
const { resetSlides } = useSlideHandler()
const { exportSingleImage } = useExport()

const mainMenuVisible = ref(false)
const hotkeyDrawerVisible = ref(false)
const editingTitle = ref(false)
const titleInputRef = ref<ComponentPublicInstance & { focus: () => void }>()
const titleValue = ref('')

// 保存状态管理
const savedStatus = ref<'saving' | 'saved'>('saved')
const lastSavedTime = ref<Date>(new Date())
const lastSavedTimeFormatted = computed(() => {
  return `上次保存: ${formatDistanceToNow(lastSavedTime.value, { locale: zhCN, addSuffix: true })}`
})

// 导出组件实例
const exportImageRef = shallowRef<ComponentPublicInstance>()

const router = useRouter()
const route = useRoute()
const projectStore = useProjectStore()

// Get current project ID from route
const currentProjectId = computed(() => route.query.id as string)

// 用于标记是否正在创建新项目的状态
const isCreatingNewProject = ref(false)

const startEditTitle = () => {
  titleValue.value = title.value
  editingTitle.value = true
  nextTick(() => titleInputRef.value?.focus())
}

const handleUpdateTitle = () => {
  // Update the title in the slides store
  slidesStore.setTitle(titleValue.value)
  editingTitle.value = false
  
  // Update project data in database to ensure synchronization
  if (currentProjectId.value) {
    updateCurrentProject()
  }
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

// Function to update the current project in the database
const updateCurrentProject = async () => {
  const id = currentProjectId.value
  if (!id) return
  
  try {
    // Set status to saving
    savedStatus.value = 'saving'
    
    // Get current project data
    const project = await projectStore.getProject(id)
    
    if (project) {
      // Update project with current slides data
      project.title = title.value
      project.slides = [...slides.value]
      project.theme = { ...theme.value }
      project.timestamp = Date.now()
      
      // Save to database - this will now update both the project store AND IndexedDB
      await projectStore.updateProject(project)
      
      // Update save status
      savedStatus.value = 'saved'
      lastSavedTime.value = new Date()
    }
  } catch (error) {
    console.error('Failed to update project:', error)
    // Still set to saved to avoid stuck in saving state
    savedStatus.value = 'saved'
  }
}

const createNewProject = async () => {
  try {
    // 标记正在创建新项目，防止自动保存触发
    isCreatingNewProject.value = true
    
    // First save current project if needed
    if (currentProjectId.value) {
      await updateCurrentProject()
    }
    
    // Then create a new project and navigate to it
    const projectId = await projectStore.createProject('未命名项目')
    console.log('[EditorHeader] Created new project with ID:', projectId)
    
    // 在导航前先手动设置标题
    titleValue.value = '未命名项目'
    slidesStore.setTitle('未命名项目')
    
    // Reset slide data before navigation to ensure clean state
    resetSlides()
    
    // 暂停一下，确保状态已更新
    await nextTick()
    
    // Navigate to the new project
    console.log('[EditorHeader] Navigating to new project...')
    await router.push(`/editor?id=${projectId}`)
    
    // 导航后再次确认标题设置正确
    setTimeout(() => {
      console.log('[EditorHeader] Confirming title after navigation')
      titleValue.value = '未命名项目'
      slidesStore.setTitle('未命名项目', projectId)
      
      // 在导航完成后，重置标记
      isCreatingNewProject.value = false
    }, 500)
  } catch (error) {
    isCreatingNewProject.value = false
    console.error('Failed to create new project:', error)
    alert('创建项目失败，请重试')
  }
}

// 监听slides变化，实现自动保存
watch(() => [...slides.value], () => {
  // 如果正在创建新项目，不触发自动保存
  if (isCreatingNewProject.value) {
    console.log('[EditorHeader] Skipping auto-save because a new project is being created')
    return
  }

  savedStatus.value = 'saving'
  
  // 添加延迟，避免频繁保存
  const saveTimeout = setTimeout(async () => {
    try {
      if (currentProjectId.value) {
        console.log(`[EditorHeader] Auto-saving slides for project ID: ${currentProjectId.value}`)
        // Use slidesStore's saveDataToStorage with project ID
        await slidesStore.saveDataToStorage(currentProjectId.value)
        console.log('[EditorHeader] Auto-save successful')
        savedStatus.value = 'saved'
        lastSavedTime.value = new Date()
      } else {
        console.log('[EditorHeader] No project ID found, using default save mechanism')
        // Fallback to updateCurrentProject when no project ID is available
        await updateCurrentProject()
      }
    } catch (error) {
      console.error('[EditorHeader] Auto-save failed:', error)
      savedStatus.value = 'saved' // Prevent UI being stuck in saving state
    }
  }, 1000)
  
  // Clean up timeout if component unmounts or watch triggers again
  return () => clearTimeout(saveTimeout)
}, { deep: true })

// 监听主题变化，实现自动保存
watch(() => theme.value, () => {
  // 如果正在创建新项目，不触发自动保存
  if (isCreatingNewProject.value) {
    console.log('[EditorHeader] Skipping theme auto-save because a new project is being created')
    return
  }

  savedStatus.value = 'saving'
  
  // 添加延迟，避免频繁保存
  const saveTimeout = setTimeout(async () => {
    try {
      if (currentProjectId.value) {
        console.log(`[EditorHeader] Auto-saving theme for project ID: ${currentProjectId.value}`)
        // Use slidesStore's saveDataToStorage with project ID
        await slidesStore.saveDataToStorage(currentProjectId.value)
        console.log('[EditorHeader] Auto-save successful')
        savedStatus.value = 'saved'
        lastSavedTime.value = new Date()
      } else {
        console.log('[EditorHeader] No project ID found, using default save mechanism')
        // Fallback to updateCurrentProject when no project ID is available
        await updateCurrentProject()
      }
    } catch (error) {
      console.error('[EditorHeader] Auto-save failed:', error)
      savedStatus.value = 'saved' // Prevent UI being stuck in saving state
    }
  }, 1000)
  
  // Clean up timeout if component unmounts or watch triggers again
  return () => clearTimeout(saveTimeout)
}, { deep: true })

// 监听项目ID变化，更新标题
watch(() => currentProjectId.value, async (newId) => {
  if (newId) {
    try {
      const project = await projectStore.getProject(newId)
      if (project?.title) {
        slidesStore.setTitle(project.title, newId)
        titleValue.value = project.title
      }
    } catch (error) {
      console.error('Failed to update title on project ID change:', error)
    }
  }
}, { immediate: true })

// 初始化时设置最后保存时间
onMounted(() => {
  // Set initial save time
  lastSavedTime.value = new Date()
  
  // 确保titleValue与当前项目保持同步
  titleValue.value = title.value
  
  // 如果有项目ID，尝试从项目中获取标题
  if (currentProjectId.value) {
    projectStore.getProject(currentProjectId.value).then(project => {
      if (project?.title) {
        // 如果项目存在并且有标题，使用项目标题更新slidesStore
        slidesStore.setTitle(project.title, currentProjectId.value)
        titleValue.value = project.title
      }
    }).catch(err => {
      console.error('Failed to get project title:', err)
    })
  }
})

const goToProjectList = () => {
  router.push('/')
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
  .button-text {
    margin-left: 5px;
    font-size: 14px;
    color: #666;
  }

  &:hover {
    background-color: #f1f1f1;
  }
}

.save-status {
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  padding: 0 10px;
  margin-left: 8px;
  color: #666;

  .icon {
    font-size: 16px;
    margin-right: 4px;
    color: #67c23a;
    
    &.rotating {
      animation: rotate 1s linear infinite;
      color: #909399;
    }
  }
  
  .status-text {
    font-size: 12px;
  }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
.nav-button {
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  padding: 0 12px;
  margin: 0 4px;
  border-radius: $borderRadius;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;

  .icon {
    font-size: 16px;
    color: #666;
  }
  
  .button-text {
    margin-left: 5px;
    font-size: 13px;
    color: #666;
  }

  &:hover {
    background-color: #f1f1f1;
    border-color: #e0e0e0;
  }
}
</style>