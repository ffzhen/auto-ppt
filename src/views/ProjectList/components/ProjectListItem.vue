<script lang="ts" setup>
import type { Project } from '@/services/database'
import ThumbnailSlide from '@/views/components/ThumbnailSlide/index.vue'
import { computed } from 'vue'
import { Document } from '@element-plus/icons-vue'

const props = defineProps<{
  project: Project
}>()

const emit = defineEmits<{
  (e: 'edit', id: string): void
  (e: 'rename', project: Project): void
  (e: 'duplicate', project: Project): void
  (e: 'delete', project: Project): void
}>()

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function handleCommand(command: string) {
  switch (command) {
    case 'edit':
      emit('edit', props.project.id)
      break
    case 'rename':
      emit('rename', props.project)
      break
    case 'duplicate':
      emit('duplicate', props.project)
      break
    default:
      break
  }
}

// 获取项目第一张幻灯片
const firstSlide = computed(() => {
  return props.project.slides && props.project.slides.length > 0 
    ? props.project.slides[0] 
    : null
})

// 检查是否有幻灯片
const hasSlides = computed(() => {
  return !!firstSlide.value
})
</script>

<template>
  <div
    class="project-item group py-4 hover:bg-gray-50 transition-colors duration-200"
    :data-project-id="project.id"
    role="listitem"
  >
    <div class="grid grid-cols-12 gap-4 items-center">
      <div class="col-span-1">
        <div class="thumbnail-container" v-if="hasSlides">
          <ThumbnailSlide
            :slide="firstSlide"
            :size="60"
            class="thumbnail"
          />
        </div>
        <div class="thumbnail-placeholder" v-else>
          <el-icon><Document /></el-icon>
        </div>
      </div>
      <div class="col-span-5">
        <h3 class="text-base font-medium text-gray-900 truncate">
          {{ project.title || '未命名项目' }}
        </h3>
      </div>
      <div class="col-span-2 text-center">
        <el-tag size="small" class="slides-count">
          {{ project.slides.length }} 张
        </el-tag>
      </div>
      <div class="col-span-2 text-center text-sm text-gray-500">
        {{ formatDate(project.timestamp) }}
      </div>
      <div class="col-span-2 text-center">
        <div 
          class="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          role="group"
          aria-label="项目操作"
        >
          <el-button 
            type="primary" 
            link
            @click="$emit('edit', project.id)"
            aria-label="编辑项目"
          >
            编辑
          </el-button>
          <el-dropdown trigger="click" @command="handleCommand">
            <el-button type="primary" link aria-label="更多操作">
              更多
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename">重命名</el-dropdown-item>
                <el-dropdown-item command="duplicate">复制</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button 
            type="danger" 
            link
            @click="$emit('delete', project)"
            aria-label="删除项目"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.project-item {
  @apply relative overflow-hidden;
  
  &::before {
    content: '';
    @apply absolute inset-y-0 -left-6 w-2 bg-gradient-to-b from-purple-500 to-pink-500 opacity-0 transition-opacity duration-200;
  }
  
  &:hover::before {
    @apply opacity-100;
  }
}

.slides-count {
  @apply bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-none;
}

.thumbnail-container {
  width: 60px;
  height: 45px; /* 按照4:3的比例 */
  overflow: hidden;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  background-color: white;
  border: 1px solid #e0e0e0;
}

.thumbnail {
  transform-origin: top left;
}

.thumbnail-placeholder {
  width: 60px;
  height: 45px;
  background-color: #f5f7fa;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #e0e0e0;
  
  .el-icon {
    font-size: 20px;
    color: #909399;
  }
}
</style> 