<template>
  <div class="template-selector">
    <div class="templates">
      <div 
        class="template" 
        :class="{ 'selected': selectedTemplateId === template.id }" 
        v-for="template in templatePreviews" 
        :key="template.id" 
        @click="selectTemplate(template.id)"
      >
        <!-- Simple template display for small previews -->
        <template v-if="displayMode === 'simple'">
          <img v-if="template.cover" :src="template.cover" :alt="template.name">
          <div v-else-if="!template.slides" class="loading-preview">
            <svg class="loading-icon" viewBox="0 0 1024 1024" width="24" height="24">
              <path d="M512 64c-247.4 0-448 200.6-448 448s200.6 448 448 448 448-200.6 448-448-200.6-448-448-448z m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" fill="#e6e6e6"></path>
              <path d="M512 140c-205.4 0-372 166.6-372 372 0 39.8 6.3 78.1 18 114.2 4.5 13.8 19.3 21.4 33.1 16.9 13.8-4.5 21.4-19.3 16.9-33.1-10-30.7-15-63-15-98 0-169.9 137.9-308 308-308s308 137.9 308 308c0 169.9-137.9 308-308 308-94.2 0-183.1-44.4-240.1-118.4-9.2-11.9-26.3-14.1-38.2-4.9-11.9 9.2-14.1 26.3-4.9 38.2 67.7 88.3 175.5 140.1 283.2 140.1 205.4 0 372-166.6 372-372s-166.6-372-372-372z" fill="#409EFF">
                <animateTransform attributeName="transform" type="rotate" from="0 512 512" to="360 512 512" dur="1s" repeatCount="indefinite"/>
              </path>
            </svg>
            加载中...
          </div>
        </template>
        
        <!-- Advanced template display with name and preview slides -->
        <template v-else>
          <div class="template-name">{{ template.name }}</div>
          <div class="preview-container">
            <ThumbnailSlide 
              v-if="template.slides && template.slides[0]"
              class="preview-slide first" 
              :slide="template.slides[0]" 
              :size="140" 
            />
            <ThumbnailSlide 
              v-if="template.slides && template.slides[1]"
              class="preview-slide second" 
              :slide="template.slides[1]" 
              :size="140" 
            />
            <div v-if="!template.slides" class="loading-preview">
              <svg class="loading-icon" viewBox="0 0 1024 1024" width="24" height="24">
                <path d="M512 64c-247.4 0-448 200.6-448 448s200.6 448 448 448 448-200.6 448-448-200.6-448-448-448z m0 820c-205.4 0-372-166.6-372-372s166.6-372 372-372 372 166.6 372 372-166.6 372-372 372z" fill="#e6e6e6"></path>
                <path d="M512 140c-205.4 0-372 166.6-372 372 0 39.8 6.3 78.1 18 114.2 4.5 13.8 19.3 21.4 33.1 16.9 13.8-4.5 21.4-19.3 16.9-33.1-10-30.7-15-63-15-98 0-169.9 137.9-308 308-308s308 137.9 308 308c0 169.9-137.9 308-308 308-94.2 0-183.1-44.4-240.1-118.4-9.2-11.9-26.3-14.1-38.2-4.9-11.9 9.2-14.1 26.3-4.9 38.2 67.7 88.3 175.5 140.1 283.2 140.1 205.4 0 372-166.6 372-372s-166.6-372-372-372z" fill="#409EFF">
                  <animateTransform attributeName="transform" type="rotate" from="0 512 512" to="360 512 512" dur="1s" repeatCount="indefinite"/>
                </path>
              </svg>
              加载中...
            </div>
          </div>
        </template>
      </div>
    </div>
    
    <div class="template-actions">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import api from '@/services'
import type { Slide } from '@/types/slides'
import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'

interface TemplatePreview {
  id: string
  name: string
  cover?: string
  slides?: Slide[]
}

interface Props {
  templates: { id: string; name: string; cover?: string }[]
  displayMode?: 'simple' | 'advanced'
  modelValue?: string
}

const props = withDefaults(defineProps<Props>(), {
  displayMode: 'simple',
  modelValue: ''
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const templatePreviews = ref<TemplatePreview[]>([])
const selectedTemplateId = ref(props.modelValue || '')

// Define functions before using them in watchers
const initTemplatePreviews = () => {
  templatePreviews.value = props.templates.map(template => ({
    id: template.id,
    name: template.name,
    cover: template.cover
  }))
  
  // Load template slides data if in advanced mode
  if (props.displayMode === 'advanced') {
    props.templates.forEach(template => {
      loadTemplateSlides(template.id)
    })
  }
}

// Load template slide data
const loadTemplateSlides = async (templateId: string) => {
  try {
    const templateData = await api.getFileData(templateId)
    if (templateData && templateData.slides && templateData.slides.length > 0) {
      // Update corresponding template slides data
      const templateIndex = templatePreviews.value.findIndex(t => t.id === templateId)
      if (templateIndex !== -1) {
        templatePreviews.value[templateIndex].slides = templateData.slides.slice(0, 2)
      }
    }
  } 
  catch (error) {
    console.error(`加载模板 ${templateId} 幻灯片数据失败`, error)
  }
}

// Select template
const selectTemplate = (id: string) => {
  selectedTemplateId.value = id
}

// Initialize template previews
watch(() => props.templates, (newTemplates) => {
  initTemplatePreviews()
}, { immediate: true })

watch(() => props.modelValue, (newValue) => {
  selectedTemplateId.value = newValue
})

watch(selectedTemplateId, (newValue) => {
  emit('update:modelValue', newValue)
})

onMounted(() => {
  // Initialize with default template if none selected
  if (!selectedTemplateId.value && templatePreviews.value.length > 0) {
    selectedTemplateId.value = templatePreviews.value[0].id
  }
})
</script>

<style lang="scss" scoped>
.template-selector {
  .templates {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    margin-bottom: 15px;
    max-height: 550px;
    overflow-y: auto;
    padding: 5px;
  
    .template {
      border: 2px solid $borderColor;
      border-radius: $borderRadius;
      width: 300px;
      cursor: pointer;
      transition: all 0.3s;
      background-color: #fff;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
      overflow: hidden;
      
      &.selected {
        border-color: $themeColor;
        box-shadow: 0 4px 15px rgba(64, 158, 255, 0.2);
      }
      
      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
      }
      
      .template-name {
        padding: 10px;
        text-align: center;
        border-bottom: 1px solid $borderColor;
        font-weight: 500;
        color: #333;
        background-color: #f8f9fa;
      }
      
      .preview-container {
        position: relative;
        height: 240px;
        background-color: #f9f9f9;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 25px 10px;
        overflow: hidden;
        perspective: 1000px;
        
        &::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(to top, rgba(249, 249, 249, 0.9), rgba(249, 249, 249, 0));
          z-index: 4;
        }
        
        .preview-slide {
          position: absolute;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
          background-color: white;
          border-radius: 4px;
          
          &.first {
            z-index: 3;
            transform: rotate(0deg) translateY(0);
          }
          
          &:nth-child(2) {
            z-index: 2;
            transform: rotate(-5deg) translateY(8px) scale(0.95);
            filter: brightness(0.95);
            box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
          }
          
          &.second {
            position: absolute;
            z-index: 1;
            transform: rotate(5deg) translateY(16px) scale(0.9);
            filter: brightness(0.9);
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
          }
        }
      }
      
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
  }
  
  .loading-preview {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
    color: #999;
    font-size: 14px;
    
    .loading-icon {
      margin-bottom: 8px;
    }
  }
}
</style> 