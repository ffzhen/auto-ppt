import { v4 as uuidv4 } from 'uuid';
import { PresentationData, CreatePresentationDto, UpdatePresentationDto } from '../types';

// In-memory database for presentations
const presentations: PresentationData[] = [];

// Default theme
const defaultTheme = {
  themeColors: ['#5b9bd5', '#ed7d31', '#a5a5a5', '#ffc000', '#4472c4', '#70ad47'],
  fontColor: '#333',
  fontName: '',
  backgroundColor: '#fff',
  shadow: {
    h: 3,
    v: 3,
    blur: 2,
    color: '#808080',
  },
  outline: {
    width: 2,
    color: '#525252',
    style: 'solid',
  },
};

export const PresentationModel = {
  // Get all presentations
  getAllPresentations(): PresentationData[] {
    return presentations;
  },

  // Get a presentation by ID
  getPresentationById(id: string): PresentationData | undefined {
    return presentations.find(presentation => presentation.id === id);
  },

  // Create a new presentation
  createPresentation(data: CreatePresentationDto): PresentationData {
    const now = new Date();
    const newPresentation: PresentationData = {
      id: uuidv4(),
      title: data.title || '未命名演示文稿',
      slides: [],
      theme: { ...defaultTheme, ...data.theme },
      viewportRatio: data.viewportRatio || 0.5625, // Default to 16:9
      createdAt: now,
      updatedAt: now,
    };
    
    presentations.push(newPresentation);
    return newPresentation;
  },

  // Update a presentation
  updatePresentation(id: string, data: UpdatePresentationDto): PresentationData | undefined {
    const index = presentations.findIndex(presentation => presentation.id === id);
    if (index === -1) return undefined;

    const updatedPresentation = {
      ...presentations[index],
      ...data,
      theme: data.theme ? { ...presentations[index].theme, ...data.theme } : presentations[index].theme,
      updatedAt: new Date(),
    };
    
    presentations[index] = updatedPresentation;
    return updatedPresentation;
  },

  // Delete a presentation
  deletePresentation(id: string): boolean {
    const index = presentations.findIndex(presentation => presentation.id === id);
    if (index === -1) return false;
    
    presentations.splice(index, 1);
    return true;
  },

  // Clone a presentation
  clonePresentation(id: string, newTitle?: string): PresentationData | undefined {
    const presentation = this.getPresentationById(id);
    if (!presentation) return undefined;

    const now = new Date();
    const clonedPresentation: PresentationData = {
      ...JSON.parse(JSON.stringify(presentation)),
      id: uuidv4(),
      title: newTitle || `${presentation.title} (复制)`,
      createdAt: now,
      updatedAt: now,
    };
    
    presentations.push(clonedPresentation);
    return clonedPresentation;
  },
}; 