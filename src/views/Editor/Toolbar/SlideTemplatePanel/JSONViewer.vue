<template>
  <div class="json-viewer">
    <div class="header">
      <div class="title-container">
        <div class="title">演示文稿完整 JSON 数据</div>
        <div class="slide-count">
          所有幻灯片
        </div>
        <div class="info-tooltip" title="此处展示的是演示文稿的完整数据，包含所有幻灯片。您可以在此查看、修改全部幻灯片的数据。">
          <i class="el-icon-info"></i>
        </div>
      </div>
      <div class="actions">
        <Button class="action-btn toggle-btn" @click="toggleEditMode">
          <i :class="isEditMode ? 'el-icon-view' : 'el-icon-edit'"></i>
          {{ isEditMode ? '查看模式' : '编辑模式' }}
        </Button>
        <Button class="action-btn format-btn" @click="formatJSON" v-if="isEditMode">
          <i class="el-icon-magic-stick"></i> 格式化
        </Button>
        <Button class="action-btn find-btn" @click="toggleFindReplace" v-if="isEditMode">
          <i class="el-icon-search"></i> 查找替换
        </Button>
        <Button class="close-btn" @click="emit('close')">
          <i class="el-icon-close"></i> 关闭
        </Button>
      </div>
    </div>
    <div class="content">
      <pre v-if="!isEditMode" class="json-preview">{{ formattedJSON }}</pre>
      <div v-else ref="editorContainer" class="editor-container">
        <MonacoEditor
          ref="monacoEditor"
          v-model:value="editorContent"
          :options="editorOptions"
          language="json"
          theme="jsonCustomTheme"
          @mount="onEditorMounted"
          class="monaco-editor-component"
          style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; right: 0; bottom: 0;"
        />
        <div class="floating-controls" v-if="isEditMode">
          <button class="find-replace-btn" @click="toggleFindReplace" title="查找替换 (Ctrl+F)">
            <i class="el-icon-search"></i>
          </button>
        </div>
      </div>
    </div>
    <div class="footer">
      <div class="left-actions">
        <input 
          type="file" 
          ref="fileInput" 
          accept=".json" 
          style="display: none;" 
          @change="handleFileImport"
        />
        <Button class="import-btn" @click="triggerFileInput">
          <i class="el-icon-upload2"></i> 导入 JSON
        </Button>
        <span class="error-message" v-if="errorMessage">
          <i class="el-icon-warning-outline"></i> {{ errorMessage }}
        </span>
      </div>
      <div class="right-actions">
        <Button class="copy-btn" @click="copyToClipboard">
          <i class="el-icon-document-copy"></i> 复制 JSON
        </Button>
        <Button class="download-btn" @click="downloadJSON">
          <i class="el-icon-download"></i> 下载 JSON
        </Button>
        <Button 
          class="apply-btn" 
          type="primary" 
          @click="applyChanges" 
          :disabled="!isEditMode || !isValidJSON"
        >
          <i class="el-icon-check"></i> 应用更改
        </Button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { storeToRefs } from 'pinia'
import { useSlidesStore } from '@/store'
import Button from '@/components/Button.vue'
import message from '@/utils/message'
import useHistorySnapshot from '@/hooks/useHistorySnapshot'
import MonacoEditor from 'monaco-editor-vue3'
import { initMonacoEditor } from '@/utils/monaco'
import * as monaco from 'monaco-editor'

const emit = defineEmits<{
  (event: 'close'): void
}>()

// 从props接收要显示的数据
const props = defineProps<{
  data?: any
}>()

const slidesStore = useSlidesStore()
const { currentSlide, theme, title, viewportSize, viewportRatio, slides } = storeToRefs(slidesStore)
const { addHistorySnapshot } = useHistorySnapshot()

// JSON 编辑状态
const isEditMode = ref(false)
const editorContent = ref('')
const errorMessage = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const editorContainer = ref<HTMLElement | null>(null)
const monacoEditor = ref<any>(null)
const editor = ref<monaco.editor.IStandaloneCodeEditor | null>(null)

// 窗口调整大小处理
let resizeObserver: ResizeObserver | null = null

// Monaco Editor 配置
const editorOptions = ref({
  automaticLayout: true,
  formatOnPaste: true,
  formatOnType: true,
  minimap: { enabled: true },
  scrollBeyondLastLine: false,
  fontSize: 14,
  tabSize: 2,
  wordWrap: 'on',
  cursorBlinking: 'smooth',
  cursorSmoothCaretAnimation: true,
  smoothScrolling: true,
  renderWhitespace: 'boundary',
  renderLineHighlight: 'all',
  renderIndentGuides: true,
  scrollbar: {
    useShadows: true,
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
  },
  // 查找替换功能
  find: {
    addExtraSpaceOnTop: false,
    autoFindInSelection: 'never',
    seedSearchStringFromSelection: 'always',
    loop: true,
  },
})

// 初始化 Monaco 编辑器
initMonacoEditor()

// 格式化JSON显示，优先使用传入的数据，否则使用完整的幻灯片信息
const formattedJSON = computed(() => {
  if (props.data) return JSON.stringify(props.data, null, 2)
  
  const jsonData = {
    title: title.value,
    width: viewportSize.value,
    height: viewportSize.value * viewportRatio.value,
    theme: theme.value,
    slides: slides.value,
  }
  return JSON.stringify(jsonData, null, 2)
})

// Monaco Editor 挂载完成
const onEditorMounted = (e: monaco.editor.IStandaloneCodeEditor) => {
  editor.value = e
  
  // 添加键盘快捷键
  if (editor.value) {
    editor.value.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF, function() {
      toggleFindReplace()
    })
  }
  
  // 立即调整布局
  setTimeout(() => {
    adjustEditorSize()
  }, 100)
}

// 调整编辑器大小
const adjustEditorSize = () => {
  if (!editor.value || !editorContainer.value) return
  
  const containerWidth = editorContainer.value.clientWidth
  const containerHeight = editorContainer.value.clientHeight
  
  editor.value.layout({
    width: containerWidth,
    height: containerHeight
  })
}

// 监听格式化的JSON，更新编辑器内容
watch(formattedJSON, (newValue) => {
  if (!isEditMode.value) {
    editorContent.value = newValue
  }
})

// 初始化编辑器内容
watch(isEditMode, (newValue) => {
  if (newValue) {
    editorContent.value = formattedJSON.value
    // 下一个事件循环中格式化代码
    setTimeout(() => {
      formatJSON()
      // 调整编辑器大小
      adjustEditorSize()
    }, 100)
  }
})

// 检查JSON是否有效，移除副作用
const isValidJSON = computed(() => {
  if (!editorContent.value) return false
  try {
    JSON.parse(editorContent.value)
    return true
  } 
  catch (e) {
    return false
  }
})

// 处理JSON验证错误的副作用
watch(editorContent, (newValue) => {
  if (!newValue) {
    errorMessage.value = ''
    return
  }
  
  try {
    JSON.parse(newValue)
    errorMessage.value = ''
  } 
  catch (e) {
    const error = e as Error
    errorMessage.value = error.message || '无效的 JSON 格式'
  }
}, { immediate: true })

// 切换编辑模式
const toggleEditMode = () => {
  isEditMode.value = !isEditMode.value
  if (isEditMode.value) {
    editorContent.value = formattedJSON.value
  }
}

// 打开查找替换面板
const toggleFindReplace = () => {
  if (editor.value) {
    const findController = editor.value.getContribution('editor.contrib.findController') as any
    if (findController) {
      findController.start({
        forceRevealReplace: true,
        seedSearchStringFromSelection: 'single',
        shouldFocus: 'find',
      })
    } 
    else {
      // 备用方法
      editor.value.getAction('actions.find')?.run()
    }
  }
}

// 格式化JSON
const formatJSON = () => {
  if (editor.value) {
    try {
      // 尝试格式化JSON
      const jsonText = editor.value.getValue()
      const parsed = JSON.parse(jsonText)
      const formatted = JSON.stringify(parsed, null, 2)
      editor.value.setValue(formatted)
      
      // 使用编辑器内置的格式化
      editor.value.getAction('editor.action.formatDocument')?.run()
      message.success('JSON 格式化成功')
    } 
    catch (error) {
      message.error('格式化失败：无效的 JSON')
    }
  }
}

// 复制到剪贴板
const copyToClipboard = () => {
  const contentToCopy = isEditMode.value ? editorContent.value : formattedJSON.value
  navigator.clipboard.writeText(contentToCopy)
    .then(() => message.success('已复制到剪贴板'))
    .catch(() => message.error('复制失败，请手动复制'))
}

// 下载JSON文件
const downloadJSON = () => {
  const contentToDownload = isEditMode.value ? editorContent.value : formattedJSON.value
  const blob = new Blob([contentToDownload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'slide_' + new Date().getTime() + '.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  message.success('已下载 JSON 文件')
}

// 导入JSON文件
const handleFileImport = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    const content = e.target?.result as string
    try {
      // 验证是否为有效的JSON
      JSON.parse(content)
      editorContent.value = content
      isEditMode.value = true
      message.success('JSON 文件导入成功')
      
      // 格式化导入的JSON
      setTimeout(() => {
        formatJSON()
      }, 100)
    } 
    catch (error) {
      message.error('导入失败：无效的 JSON 文件')
    }
    
    // 重置 input 以允许导入相同的文件
    if (fileInput.value) fileInput.value.value = ''
  }
  
  reader.readAsText(file)
}

// 应用更改到幻灯片
const applyChanges = () => {
  if (!isValidJSON.value) return
  
  try {
    const newData = JSON.parse(editorContent.value)
    
    // 检查是否为有效的数据结构
    if (typeof newData !== 'object') {
      message.error('无效的数据结构')
      return
    }
    
    // 如果是完整的演示文稿数据
    if (newData.slides && Array.isArray(newData.slides)) {
      // 更新主题
      if (newData.theme) {
        slidesStore.setTheme(newData.theme)
      }
      
      // 更新标题
      if (newData.title) {
        slidesStore.setTitle(newData.title)
      }
      
      // 更新所有幻灯片
      if (newData.slides.length > 0) {
        // 检查幻灯片数据格式是否正确
        const validSlides = newData.slides.every((slide: any) => slide.id)
        if (validSlides) {
          slidesStore.setSlides(newData.slides)
          message.success('已更新所有幻灯片')
        }
        else {
          message.error('幻灯片数据格式不正确')
          return
        }
      }
    }
    // 如果只是单个幻灯片数据
    else if (newData.id) {
      slidesStore.updateSlide(newData)
    }
    else {
      message.error('无效的幻灯片数据结构')
      return
    }
    
    addHistorySnapshot()
    message.success('已应用 JSON 更改')
    isEditMode.value = false
  } 
  catch (error) {
    message.error('应用更改失败')
  }
}

// 触发文件输入
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

onMounted(() => {
  // 初始化编辑器内容
  editorContent.value = formattedJSON.value
  
  // 监听窗口大小变化
  window.addEventListener('resize', adjustEditorSize)
})

onBeforeUnmount(() => {
  // 清理 ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', adjustEditorSize)
})
</script>

<style lang="scss" scoped>
.json-viewer {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 90vw;
  height: 90vh;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
  flex-shrink: 0;

  .title-container {
    display: flex;
    align-items: center;
    
    .title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
    }
    
    .slide-count {
      margin-left: 8px;
      font-size: 12px;
      background-color: #ecf5ff;
      color: #409EFF;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: normal;
    }
    
    .info-tooltip {
      margin-left: 8px;
      font-size: 14px;
      color: #909399;
      cursor: help;
      
      &:hover {
        color: #409EFF;
      }
    }
  }
  
  .actions {
    display: flex;
    gap: 10px;
    
    .action-btn {
      display: flex;
      align-items: center;
      transition: all 0.3s ease;
      
      i {
        margin-right: 5px;
      }
      
      &.toggle-btn {
        background-color: #ecf5ff;
        border-color: #d9ecff;
        color: #409EFF;
        
        &:hover {
          background-color: #409EFF;
          border-color: #409EFF;
          color: white;
        }
      }
      
      &.format-btn {
        background-color: #f0f9eb;
        border-color: #e1f3d8;
        color: #67c23a;
        
        &:hover {
          background-color: #67c23a;
          border-color: #67c23a;
          color: white;
        }
      }
      
      &.find-btn {
        background-color: #fdf6ec;
        border-color: #faecd8;
        color: #e6a23c;
        
        &:hover {
          background-color: #e6a23c;
          border-color: #e6a23c;
          color: white;
        }
      }
    }
    
    .close-btn {
      display: flex;
      align-items: center;
      background-color: #fef0f0;
      border-color: #fde2e2;
      color: #f56c6c;
      
      &:hover {
        background-color: #f56c6c;
        border-color: #f56c6c;
        color: white;
      }
    }
  }
}

.content {
  flex: 1;
  overflow: hidden;
  position: relative;
  display: flex;
  min-height: 0;
  
  .json-preview {
    margin: 0;
    padding: 15px;
    height: 100%;
    width: 100%;
    overflow: auto;
    font-family: 'JetBrains Mono', 'Fira Code', 'Source Code Pro', monospace;
    font-size: 14px;
    color: #0451a5;
    white-space: pre-wrap;
    background-color: #f8f8f8;
    box-sizing: border-box;
  }
  
  .editor-container {
    height: 100%;
    width: 100%;
    overflow: hidden;
    position: relative;
    
    .floating-controls {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 100;
      display: flex;
      gap: 6px;
      
      .find-replace-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border-radius: 4px;
        background-color: rgba(255, 255, 255, 0.8);
        border: 1px solid #dcdfe6;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 18px;
        color: #606266;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        
        &:hover {
          background-color: #ecf5ff;
          color: #409EFF;
        }
        
        &:active {
          transform: translateY(1px);
        }
      }
    }
  }
}

.footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  border-top: 1px solid #eee;
  background-color: #f8f9fa;
  flex-shrink: 0;
  
  .left-actions, .right-actions {
    display: flex;
    gap: 10px;
    align-items: center;
  }
  
  .left-actions {
    .import-btn {
      display: flex;
      align-items: center;
      background-color: #f4f4f5;
      border-color: #dcdfe6;
      color: #606266;
      transition: all 0.3s ease;
      
      i {
        margin-right: 5px;
      }
      
      &:hover {
        background-color: #e9e9eb;
        border-color: #dcdfe6;
      }
    }
    
    .error-message {
      color: #f56c6c;
      font-size: 13px;
      margin-left: 10px;
      display: flex;
      align-items: center;
      
      i {
        margin-right: 5px;
      }
    }
  }
  
  .right-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    
    .el-button, button {
      display: flex;
      align-items: center;
      transition: all 0.3s ease;
      
      i {
        margin-right: 5px;
      }
    }
    
    .copy-btn {
      background-color: #f4f4f5;
      border-color: #dcdfe6;
      color: #606266;
      
      &:hover {
        background-color: #e9e9eb;
        border-color: #dcdfe6;
      }
    }
    
    .download-btn {
      background-color: #f0f9eb;
      border-color: #e1f3d8;
      color: #67c23a;
      
      &:hover {
        background-color: #67c23a;
        border-color: #67c23a;
        color: white;
      }
    }
    
    .apply-btn {
      padding: 8px 16px;
      
      &:not(:disabled) {
        background-color: #409EFF;
        border-color: #409EFF;
        
        &:hover {
          background-color: #66b1ff;
          border-color: #66b1ff;
        }
      }
    }
  }
}

:deep(.monaco-editor) {
  width: 100% !important;
  height: 100% !important;
  
  .monaco-editor, .overflow-guard, .monaco-scrollable-element {
    width: 100% !important;
    height: 100% !important;
  }
  
  .editor-scrollable {
    width: 100% !important;
    height: 100% !important;
  }
  
  .margin {
    background-color: #f8f8f8;
  }
  
  .monaco-editor-background {
    background-color: #f8f8f8;
  }
}

:deep(.monaco-editor-container) {
  width: 100% !important;
  height: 100% !important;
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
  background-color: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: #e1e1e1;
  border-radius: 4px;

  &:hover {
    background-color: #d1d1d1;
  }
}
</style> 