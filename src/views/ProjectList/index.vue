<template>
  <div class="project-list max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
    <!-- Memphis style background decorations -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
      <div class="memphis-circle"></div>
      <div class="memphis-zigzag"></div>
      <div class="memphis-dots"></div>
      <div class="memphis-lines"></div>
    </div>

    <ProjectListHeader @create="handleCreateProject" />

    <div class="project-list-container bg-white rounded-xl p-6 shadow-lg relative overflow-hidden">
      <!-- List header -->
      <div class="list-header mb-6 pb-4 border-b border-gray-100">
        <div class="grid grid-cols-12 gap-4 text-sm font-medium text-gray-500">
          <div class="col-span-6">项目名称</div>
          <div class="col-span-2 text-center">幻灯片数</div>
          <div class="col-span-2 text-center">修改时间</div>
          <div class="col-span-2 text-center">操作</div>
        </div>
      </div>

      <el-alert
        v-if="projectStore.error"
        :title="projectStore.error.message"
        type="error"
        show-icon
        class="mb-4"
      />

      <div v-if="projectStore.isInitializing" class="text-center py-8">
        <el-icon class="animate-spin text-2xl text-primary-500 mb-2"><Loading /></el-icon>
        <p class="text-gray-500">数据初始化中，请稍等...</p>
      </div>

      <LoadingState v-else-if="projectStore.isLoading" />

      <EmptyState 
        v-else-if="!projectStore.projects.length" 
        @create="handleCreateProject"
      />

      <!-- Project list with infinite scroll and no scrollbar -->
      <div
        v-else
        ref="listContainer"
        class="relative project-list-scroll hide-scrollbar"
        role="list"
        aria-label="项目列表"
      >
        <TransitionGroup
          name="project-list"
          tag="div"
          class="divide-y divide-gray-100"
        >
          <ProjectListItem
            v-for="project in visibleProjects"
            :key="project.id"
            :project="project"
            @edit="handleEditProject"
            @rename="showRenameDialog"
            @duplicate="handleDuplicateProject"
            @delete="handleDeleteProject"
          />
        </TransitionGroup>
        
        <!-- Loading indicator at bottom of list -->
        <div v-if="loadingMore" class="py-4 text-center">
          <el-icon class="animate-spin text-lg text-primary-500 mr-2"><Loading /></el-icon>
          <span class="text-sm text-gray-500">加载更多项目...</span>
        </div>
      </div>
    </div>

    <el-dialog
      v-model="renameDialogVisible"
      title="重命名项目"
      width="90%"
      max-width="400px"
      :close-on-click-modal="false"
      center
      destroy-on-close
      class="memphis-dialog"
    >
      <el-form @submit.prevent="handleRenameSubmit">
        <el-form-item>
          <el-input
            v-model="newProjectTitle"
            placeholder="请输入项目名称"
            autofocus
            maxlength="50"
            show-word-limit
            @keyup.enter="handleRenameSubmit"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="renameDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            :disabled="!newProjectTitle.trim()"
            @click="handleRenameSubmit"
          >
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useProjectStore } from '@/store/projects'
import ProjectListHeader from './components/ProjectListHeader.vue'
import ProjectListItem from './components/ProjectListItem.vue'
import EmptyState from './components/EmptyState.vue'
import LoadingState from './components/LoadingState.vue'
import { useProjectOperations } from './composables/useProjectOperations'
import { Loading } from '@element-plus/icons-vue'

const projectStore = useProjectStore()
const {
  renameDialogVisible,
  newProjectTitle,
  handleCreateProject,
  handleEditProject,
  handleDeleteProject,
  handleDuplicateProject,
  showRenameDialog,
  handleRenameSubmit
} = useProjectOperations()

// Container ref for scroll event
const listContainer = ref(null)

// Track loading state for infinite scrolling
const loadingMore = ref(false)
const hasMoreProjects = ref(true)
const itemsPerPage = ref(10)
const currentPage = ref(1)

// Calculate visible projects based on current page
const visibleProjects = computed(() => {
  const allProjects = projectStore.projects
  const endIndex = currentPage.value * itemsPerPage.value
  return allProjects.slice(0, endIndex)
})

// Function to load more projects
async function loadMoreProjects() {
  if (loadingMore.value || !hasMoreProjects.value) return
  
  loadingMore.value = true
  console.log('Loading more projects...')
  
  try {
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Increment page to show more projects
    currentPage.value++
    
    // If we've loaded all projects, mark as no more to load
    if (currentPage.value * itemsPerPage.value >= projectStore.projects.length) {
      hasMoreProjects.value = false
    }
  } 
  catch (error) {
    console.error('Failed to load more projects:', error)
  } 
  finally {
    loadingMore.value = false
  }
}

// Handle scroll event for infinite scrolling
function handleScroll() {
  if (!listContainer.value) return
  
  const container = listContainer.value
  const { scrollTop, scrollHeight, clientHeight } = container
  
  // When user scrolls to 80% of the bottom, load more
  if (scrollTop + clientHeight > scrollHeight * 0.8 && !loadingMore.value && hasMoreProjects.value) {
    loadMoreProjects()
  }
}

// Set up scroll listener
onMounted(() => {
  if (listContainer.value) {
    listContainer.value.addEventListener('scroll', handleScroll)
  }
  
  // Initial load
  projectStore.fetchProjects()
})

// Clean up
onUnmounted(() => {
  if (listContainer.value) {
    listContainer.value.removeEventListener('scroll', handleScroll)
  }
})
</script>

<style lang="scss" scoped>
// Project list with infinite scrolling
.project-list-scroll {
  max-height: 70vh;
  overflow-y: auto;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
  
  &::-webkit-scrollbar {
    display: none; /* Chrome, Safari, newer Edge */
  }
}

// Memphis style decorations
.memphis-circle {
  @apply absolute w-64 h-64 rounded-full border-8 border-yellow-300 -top-20 -right-20 transform rotate-45;
}

.memphis-zigzag {
  @apply absolute w-40 h-40 border-4 border-blue-400 bottom-10 left-10;
  clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
  background: repeating-linear-gradient(45deg, transparent, transparent 10px, currentColor 10px, currentColor 20px);
}

.memphis-dots {
  @apply absolute w-full h-full;
  background-image: radial-gradient(circle, #e879f9 2px, transparent 2px);
  background-size: 30px 30px;
  opacity: 0.2;
}

.memphis-lines {
  @apply absolute w-full h-full;
  background: repeating-linear-gradient(-45deg, transparent, transparent 20px, #60a5fa 20px, #60a5fa 22px);
  opacity: 0.1;
}

// Project list container
.project-list-container {
  @apply relative;
  height: auto;
  min-height: 400px;
  
  &::before {
    content: '';
    @apply absolute -top-1 -right-1 w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-bl-3xl;
  }
  
  &::after {
    content: '';
    @apply absolute -bottom-1 -left-1 w-20 h-20 bg-gradient-to-tr from-blue-500/20 to-cyan-500/20 rounded-tr-3xl;
  }
}

.list-header {
  @apply relative;
  
  &::after {
    content: '';
    @apply absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-purple-500/50;
  }
}

// Transitions
.project-list-move,
.project-list-enter-active,
.project-list-leave-active {
  @apply transition-all duration-300;
}

.project-list-enter-from,
.project-list-leave-to {
  @apply opacity-0 -translate-x-4;
}

.project-list-leave-active {
  @apply absolute w-full;
}

// Dialog
.memphis-dialog {
  :deep(.el-dialog) {
    @apply rounded-xl overflow-hidden;
    background: linear-gradient(135deg, #fff 85%, #fdf4ff 100%);
    
    &::before {
      content: '';
      @apply absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-50;
    }
  }
  
  :deep(.el-dialog__header) {
    @apply relative pb-4 mb-4;
    
    &::after {
      content: '';
      @apply absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500;
    }
  }
}
</style> 