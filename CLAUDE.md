# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Auto-PPT is a comprehensive web-based presentation application built with Vue 3 and TypeScript. It's a full-featured PowerPoint alternative that runs in the browser, supporting slide creation, editing, and presentation modes. The project consists of a Vue.js frontend and an Express.js backend API.

## Development Commands

### Frontend (Vue.js Application)
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check

# Linting
npm run lint

# Preview production build
npm run preview
```

### Backend (Express.js Server)
```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## Architecture

### Frontend Architecture
- **Framework**: Vue 3 with Composition API and TypeScript
- **State Management**: Pinia stores (main store for UI state, slides store for presentation data)
- **Routing**: Vue Router for navigation between editor and project list
- **Rich Text**: ProseMirror for advanced text editing capabilities
- **Styling**: SCSS + Tailwind CSS with custom design system
- **UI Components**: Custom components (no external UI library dependency) + Element Plus for specific components

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Data Storage**: File-based storage (JSON files) with template management
- **API Design**: RESTful API with endpoints for presentations, tools, and AI features
- **Static Assets**: Built-in file serving with caching strategies

### Key Store Structure
- **mainStore**: UI state, canvas management, tool states, active elements
- **slidesStore**: Presentation data, slide elements, themes, viewport settings
- **snapshotStore**: History management for undo/redo functionality
- **screenStore**: Presentation mode state
- **keyboardStore**: Global keyboard shortcuts and hotkeys

### Element System
The application supports multiple element types:
- **Text**: Rich text editing with ProseMirror
- **Image**: Image manipulation, cropping, filters
- **Shape**: Custom SVG shapes with gradients and fills
- **Line**: Various line styles and endpoints
- **Chart**: ECharts integration for data visualization
- **Table**: Editable tables with styling options
- **LaTeX**: Mathematical formula rendering
- **Video/Audio**: Media element support

### File Structure Conventions
- **Components**: Reusable UI components in `/src/components`
- **Views**: Page-level components in `/src/views`
- **Store**: Pinia stores in `/src/store`
- **Types**: TypeScript definitions in `/src/types`
- **Utils**: Helper functions and utilities in `/src/utils`
- **Hooks**: Composition API functions in `/src/hooks`
- **Configs**: Configuration files for themes, animations, elements

### API Endpoints
- `/api/presentations` - CRUD operations for presentations
- `/api/tools` - Export and utility functions
- `/api/ai` - AI-powered slide generation
- `/api/templates/:templateId` - Template data with pagination
- `/health` - Health check endpoint

### Template System
Templates are stored as JSON files in `/server/public/assets/data/` with support for:
- Full template loading
- Paginated slide loading
- Metadata-only endpoints
- Template versioning

### Key Features
- **Canvas System**: Zoom, pan, grid, ruler, alignment tools
- **Element Operations**: Select, move, resize, rotate, group, align
- **Rich Text Editing**: ProseMirror-based with extensive formatting
- **Export Options**: PPTX, PDF, JSON, image formats
- **AI Integration**: Automated slide generation from outlines
- **Presentation Mode**: Full-screen presenter view with tools
- **Mobile Support**: Basic editing and preview on mobile devices

### Development Notes
- The application uses a custom element system with SVG-based rendering
- All interactive elements have keyboard shortcuts
- The canvas supports precise pixel-perfect positioning
- Templates can be customized and extended
- The system supports multiple aspect ratios (16:9, 16:10, 4:3)
- Extensive use of TypeScript for type safety across the entire codebase