<template>
  <div class="pptist-editor">
    <EditorHeader class="layout-header" />
    <div class="layout-content">
      <Thumbnails class="layout-content-left" />
      <div class="layout-content-center">
        <CanvasTool class="center-top" />
        <Canvas class="center-body" :style="{ height: `calc(100% - ${remarkHeight + 40}px)` }" />
        <Remark
          class="center-bottom" 
          v-model:height="remarkHeight" 
          :style="{ height: `${remarkHeight}px` }"
        />
      </div>
      <Toolbar class="layout-content-right" />
    </div>
    <!-- 浮动按钮区域 -->
    <div class="floating-buttons">
      <div class="json-viewer-btn" @click="showJSONViewer = true" title="查看当前页面JSON">
        <span>JSON</span>
      </div>
      <div class="md-to-ppt-btn" @click="showMarkdownToPPT = true" title="Markdown转PPT">
        <span>MD→PPT</span>
      </div>
    </div>
  </div>

  <SelectPanel v-if="showSelectPanel" />
  <SearchPanel v-if="showSearchPanel" />
  <NotesPanel v-if="showNotesPanel" />
  <MarkupPanel v-if="showMarkupPanel" />

  <Modal
    :visible="!!dialogForExport" 
    :width="680"
    @closed="closeExportDialog()"
  >
    <ExportDialog />
  </Modal>

  <Modal
    :visible="showAIPPTDialog" 
    :width="680"
    :closeOnClickMask="false"
    :closeOnEsc="false"
    closeButton
    @closed="closeAIPPTDialog()"
  >
    <AIPPTDialog />
  </Modal>
  
  <!-- JSON viewer modal -->
  <Modal
    :visible="showJSONViewer" 
    :width="900"
    :height="700"
    closeButton
    @closed="showJSONViewer = false"
  >
    <JSONViewer :data="currentSlide" @close="showJSONViewer = false" />
  </Modal>
  
  <!-- Markdown to PPT modal -->
  <Modal
    :visible="showMarkdownToPPT" 
    :width="900"
    :height="700"
    closeButton
    @closed="showMarkdownToPPT = false"
  >
    <MarkdownToPPT @close="showMarkdownToPPT = false" />
  </Modal>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useMainStore, useSlidesStore } from '@/store'
import useGlobalHotkey from '@/hooks/useGlobalHotkey'
import usePasteEvent from '@/hooks/usePasteEvent'

import EditorHeader from './EditorHeader/index.vue'
import Canvas from './Canvas/index.vue'
import CanvasTool from './CanvasTool/index.vue'
import Thumbnails from './Thumbnails/index.vue'
import Toolbar from './Toolbar/index.vue'
import Remark from './Remark/index.vue'
import ExportDialog from './ExportDialog/index.vue'
import SelectPanel from './SelectPanel.vue'
import SearchPanel from './SearchPanel.vue'
import NotesPanel from './NotesPanel.vue'
import MarkupPanel from './MarkupPanel.vue'
import AIPPTDialog from './AIPPTDialog.vue'
import JSONViewer from './Toolbar/SlideTemplatePanel/JSONViewer.vue'
import MarkdownToPPT from './Toolbar/SlideTemplatePanel/MarkdownToPPT.vue'
import Modal from '@/components/Modal.vue'

const mainStore = useMainStore()
const slidesStore = useSlidesStore()
const { dialogForExport, showSelectPanel, showSearchPanel, showNotesPanel, showMarkupPanel, showAIPPTDialog } = storeToRefs(mainStore)
const { currentSlide } = storeToRefs(slidesStore)
const closeExportDialog = () => mainStore.setDialogForExport('')
const closeAIPPTDialog = () => mainStore.setAIPPTDialogState(false)

const remarkHeight = ref(40)
const showJSONViewer = ref(false)
const showMarkdownToPPT = ref(false)

useGlobalHotkey()
usePasteEvent()
</script>

<style lang="scss" scoped>
.pptist-editor {
  height: 100%;
  position: relative;
}
.layout-header {
  height: 40px;
}
.layout-content {
  height: calc(100% - 40px);
  display: flex;
}
.layout-content-left {
  width: 160px;
  height: 100%;
  flex-shrink: 0;
}
.layout-content-center {
  width: calc(100% - 160px - 260px);

  .center-top {
    height: 40px;
  }
}
.layout-content-right {
  width: 260px;
  height: 100%;
}

.floating-buttons {
  position: fixed;
  right: 270px;
  top: 6px;
  z-index: 100;
  display: flex;
  gap: 10px;
}

.json-viewer-btn, .md-to-ppt-btn {
  background-color: #606266;
  color: #fff;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
  opacity: 0.6;
  transition: all 0.2s;
  
  &:hover {
    opacity: 1;
  }
}

.md-to-ppt-btn {
  background-color: #409eff;
}
</style>