<template>
  <div class="export-button-container">
    <button 
      class="export-button" 
      @click="openExportMenu" 
      :disabled="loading"
    >
      {{ loading ? '导出中...' : '导出' }}
    </button>
    
    <div class="export-menu" v-if="showMenu" v-click-outside="closeExportMenu">
      <div class="export-menu-header">导出选项</div>
      
      <div class="export-menu-item" @click="exportAs('pdf')">
        导出为PDF
      </div>
      
      <div class="export-menu-item" @click="exportAs('pptx')">
        导出为PPTX
      </div>
      
      <div class="export-menu-item" @click="exportAs('image')">
        导出为图片
      </div>
      
      <div class="export-option">
        <input 
          type="checkbox" 
          id="use-link" 
          v-model="useLink"
        >
        <label for="use-link">使用下载链接（两步下载）</label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import api from '@/services'
import message from '@/utils/message'

export default defineComponent({
  name: 'ExportButton',
  
  props: {
    presentationId: {
      type: String,
      required: true
    }
  },
  
  setup(props) {
    const showMenu = ref(false)
    const loading = ref(false)
    const useLink = ref(false)
    
    const openExportMenu = () => {
      showMenu.value = true
    }
    
    const closeExportMenu = () => {
      showMenu.value = false
    }
    
    const exportAs = async (format: 'pdf' | 'pptx' | 'image') => {
      loading.value = true
      showMenu.value = false
      
      try {
        // 使用导出和下载助手方法
        await api.exportAndDownload(
          props.presentationId, 
          format, 
          !useLink.value
        )
        message.success(`导出${format.toUpperCase()}成功！`)
      } catch (error) {
        console.error('导出失败:', error)
        message.error(`导出${format.toUpperCase()}失败！`)
      } finally {
        loading.value = false
      }
    }
    
    return {
      showMenu,
      loading,
      useLink,
      openExportMenu,
      closeExportMenu,
      exportAs
    }
  }
})
</script>

<style lang="scss" scoped>
.export-button-container {
  position: relative;
  display: inline-block;
}

.export-button {
  padding: 8px 16px;
  background-color: #4472c4;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background-color: #3a62ae;
  }
  
  &:disabled {
    background-color: #a0aec0;
    cursor: not-allowed;
  }
}

.export-menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 200px;
  background-color: white;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  margin-top: 5px;
}

.export-menu-header {
  padding: 10px 15px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
}

.export-menu-item {
  padding: 10px 15px;
  cursor: pointer;
  
  &:hover {
    background-color: #f5f5f5;
  }
}

.export-option {
  padding: 10px 15px;
  border-top: 1px solid #eee;
  display: flex;
  align-items: center;
  
  input {
    margin-right: 8px;
  }
}
</style> 