import { ref } from 'vue'

export interface Project {
  id: string
  title: string
  timestamp: number
  slides: any[]
  theme: Record<string, any>
}

const DB_NAME = 'pptist-presentations'
const STORE_NAME = 'presentations'
const DB_VERSION = 1

// Create a single shared database instance
let dbInstance: IDBDatabase | null = null
let dbInitPromise: Promise<IDBDatabase> | null = null

export const useDatabase = () => {
  const isInitialized = ref(false)
  
  // This function initializes the database if it hasn't been initialized yet
  function openDatabase(): Promise<IDBDatabase> {
    // If we already have a database instance, return it immediately
    if (dbInstance) {
      isInitialized.value = true
      return Promise.resolve(dbInstance)
    }
    
    // If we're in the process of opening the database, return that promise
    if (dbInitPromise) {
      return dbInitPromise
    }

    // Otherwise, create a new promise to open the database
    console.log('Starting IndexedDB initialization...')
    dbInitPromise = new Promise((resolve, reject) => {
      try {
        console.log('Opening IndexedDB database...')
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        
        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          console.log('Database upgrade needed, creating object store...')
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME, { keyPath: 'id' })
            console.log('Object store created successfully')
          }
        }
        
        request.onsuccess = () => {
          console.log('Database opened successfully')
          dbInstance = request.result
          isInitialized.value = true
          resolve(dbInstance)
        }
        
        request.onerror = () => {
          console.error('Error opening database:', request.error)
          dbInitPromise = null // Reset the promise on error
          reject(request.error)
        }
      } 
      catch (err) {
        console.error('Unexpected error during database initialization:', err)
        dbInitPromise = null
        reject(err)
      }
    })

    return dbInitPromise
  }

  // Try to initialize the database immediately
  openDatabase().catch(err => {
    console.error('Failed to initialize database on startup:', err)
  })

  async function getAllProjects(): Promise<Project[]> {
    try {
      console.log('Getting all projects...')
      const db = await openDatabase()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.getAll()
        
        request.onsuccess = () => {
          console.log(`Retrieved ${request.result.length} projects`)
          resolve(request.result)
        }
        request.onerror = () => {
          console.error('Error getting projects:', request.error)
          reject(request.error)
        }
      })
    } 
    catch (error) {
      console.error('Error in getAllProjects:', error)
      throw error
    }
  }

  async function getProject(id: string): Promise<Project | null> {
    try {
      console.log(`Getting project with id: ${id}`)
      const db = await openDatabase()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.get(id)
        
        request.onsuccess = () => {
          console.log('Project retrieved:', request.result)
          resolve(request.result || null)
        }
        request.onerror = () => {
          console.error('Error getting project:', request.error)
          reject(request.error)
        }
      })
    } 
    catch (error) {
      console.error('Error in getProject:', error)
      throw error
    }
  }

  async function createProject(project: Project): Promise<void> {
    try {
      console.log('Creating new project:', project)
      const db = await openDatabase()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.add(project)
        
        request.onsuccess = () => {
          console.log('Project created successfully')
          resolve()
        }
        request.onerror = () => {
          console.error('Error creating project:', request.error)
          reject(request.error)
        }
      })
    } 
    catch (error) {
      console.error('Error in createProject:', error)
      throw error
    }
  }

  async function updateProject(project: Project): Promise<void> {
    try {
      console.log('Updating project:', project)
      const db = await openDatabase()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.put(project)
        
        request.onsuccess = () => {
          console.log('Project updated successfully')
          resolve()
        }
        request.onerror = () => {
          console.error('Error updating project:', request.error)
          reject(request.error)
        }
      })
    } 
    catch (error) {
      console.error('Error in updateProject:', error)
      throw error
    }
  }

  async function deleteProject(id: string): Promise<void> {
    try {
      console.log(`Deleting project with id: ${id}`)
      const db = await openDatabase()
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const store = transaction.objectStore(STORE_NAME)
        const request = store.delete(id)
        
        request.onsuccess = () => {
          console.log('Project deleted successfully')
          resolve()
        }
        request.onerror = () => {
          console.error('Error deleting project:', request.error)
          reject(request.error)
        }
      })
    } 
    catch (error) {
      console.error('Error in deleteProject:', error)
      throw error
    }
  }

  return {
    isInitialized,
    getAllProjects,
    getProject,
    createProject,
    updateProject,
    deleteProject,
  }
} 