import { defineStore } from 'pinia'
import { ref, computed, onMounted } from 'vue'
import { useDatabase, type Project } from '@/services/database'

export const useProjectStore = defineStore('projects', () => {
  const database = useDatabase()
  
  const projects = ref<Project[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)
  const isInitializing = ref(true)
  const initializationAttempts = ref(0)
  const maxInitAttempts = 10
  
  const sortedProjects = computed(() => {
    return [...projects.value].sort((a, b) => b.timestamp - a.timestamp)
  })
  
  async function initializeDatabase(): Promise<boolean> {
    console.log('Attempting database initialization...')
    
    // If already initialized, return true
    if (database.isInitialized.value) {
      isInitializing.value = false
      return true
    }
    
    // If max attempts reached, return false
    if (initializationAttempts.value >= maxInitAttempts) {
      isInitializing.value = false
      error.value = new Error('Database initialization timed out')
      return false
    }
    
    // Wait for initialization
    initializationAttempts.value++
    
    try {
      // Try database operation to force initialization
      await database.getAllProjects()
      isInitializing.value = false
      return true
    } 
    catch (err) {
      console.warn(`Initialization attempt ${initializationAttempts.value} failed, retrying...`)
      
      // Wait and try again
      await new Promise(resolve => setTimeout(resolve, 500))
      return initializeDatabase()
    }
  }
  
  async function fetchProjects() {
    // Make sure database is initialized
    if (isInitializing.value) {
      const initialized = await initializeDatabase()
      if (!initialized) {
        console.error('Failed to initialize database after multiple attempts')
        return
      }
    }

    isLoading.value = true
    error.value = null
    
    try {
      projects.value = await database.getAllProjects()
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to fetch projects')
      console.error('Error fetching projects:', err)
    }
    finally {
      isLoading.value = false
    }
  }
  
  async function getProject(id: string): Promise<Project | null> {
    // Make sure database is initialized
    if (isInitializing.value) {
      const initialized = await initializeDatabase()
      if (!initialized) {
        console.error('Failed to initialize database after multiple attempts')
        throw new Error('Database initialization failed')
      }
    }
    
    try {
      // Try to get from cache first
      const cachedProject = projects.value.find(p => p.id === id)
      if (cachedProject) {
        console.log('Project found in cache:', id)
        return cachedProject
      }
      
      // Fetch from database
      console.log('Fetching project from database:', id)
      const project = await database.getProject(id)
      
      if (project) {
        // Update cache
        const existingIndex = projects.value.findIndex(p => p.id === id)
        if (existingIndex >= 0) {
          projects.value[existingIndex] = project
        } 
        else {
          projects.value.push(project)
        }
      }
      
      return project
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to get project')
      console.error('Error getting project:', err)
      throw error.value
    }
  }
  
  async function createProject(title: string = '未命名项目') {
    if (isInitializing.value) {
      await initializeDatabase()
    }
    
    if (isInitializing.value) {
      throw new Error('Database is still initializing')
    }

    const projectId = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15)
                     
    const newProject: Project = {
      id: projectId,
      title,
      timestamp: Date.now(),
      slides: [],
      theme: {}
    }
    
    try {
      await database.createProject(newProject)
      projects.value.push(newProject)
      return projectId
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to create project')
      console.error('Error creating project:', err)
      throw error.value
    }
  }
  
  async function updateProject(project: Project) {
    try {
      await database.updateProject(project)
      const index = projects.value.findIndex(p => p.id === project.id)
      if (index !== -1) {
        projects.value[index] = project
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to update project')
      console.error('Error updating project:', err)
      throw error.value
    }
  }
  
  async function deleteProject(id: string) {
    try {
      await database.deleteProject(id)
      projects.value = projects.value.filter(p => p.id !== id)
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to delete project')
      console.error('Error deleting project:', err)
      throw error.value
    }
  }
  
  // Initialize database when store is created
  initializeDatabase()
  
  return {
    projects: sortedProjects,
    isLoading,
    isInitializing,
    error,
    fetchProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
  }
}) 