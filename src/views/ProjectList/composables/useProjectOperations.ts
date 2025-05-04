import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useProjectStore } from '@/store/projects'
import type { Project } from '@/services/database'

export function useProjectOperations() {
  const router = useRouter()
  const projectStore = useProjectStore()
  const renameDialogVisible = ref(false)
  const newProjectTitle = ref('')
  const selectedProject = ref<Project | null>(null)

  async function handleCreateProject() {
    try {
      const projectId = await projectStore.createProject()
      router.push(`/editor?id=${projectId}`)
    }
    catch (error) {
      ElMessageBox.alert('创建项目失败，请重试', '错误', {
        type: 'error',
        confirmButtonText: '确定'
      })
    }
  }

  function handleEditProject(projectId: string) {
    router.push(`/editor?id=${projectId}`)
  }

  async function handleDeleteProject(project: Project) {
    try {
      await ElMessageBox.confirm('确定要删除这个项目吗？此操作不可恢复。', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await projectStore.deleteProject(project.id)
    }
    catch (error) {
      if (error !== 'cancel') {
        ElMessageBox.alert('删除项目失败，请重试', '错误', {
          type: 'error',
          confirmButtonText: '确定'
        })
      }
    }
  }

  async function handleDuplicateProject(project: Project) {
    try {
      const projectId = await projectStore.createProject(`${project.title} (副本)`)
      router.push(`/editor?id=${projectId}`)
    }
    catch (error) {
      ElMessageBox.alert('复制项目失败，请重试', '错误', {
        type: 'error',
        confirmButtonText: '确定'
      })
    }
  }

  function showRenameDialog(project: Project) {
    selectedProject.value = project
    newProjectTitle.value = project.title
    renameDialogVisible.value = true
  }

  async function handleRenameSubmit() {
    if (!selectedProject.value || !newProjectTitle.value.trim()) return

    try {
      await projectStore.updateProject({
        ...selectedProject.value,
        title: newProjectTitle.value.trim(),
        timestamp: Date.now()
      })
      renameDialogVisible.value = false
    }
    catch (error) {
      ElMessageBox.alert('重命名项目失败，请重试', '错误', {
        type: 'error',
        confirmButtonText: '确定'
      })
    }
  }

  return {
    renameDialogVisible,
    newProjectTitle,
    handleCreateProject,
    handleEditProject,
    handleDeleteProject,
    handleDuplicateProject,
    showRenameDialog,
    handleRenameSubmit
  }
} 