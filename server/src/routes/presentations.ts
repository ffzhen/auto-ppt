import { Router } from 'express';
import { PresentationController } from '../controllers/presentations';

const router = Router();

// Get all presentations
router.get('/', PresentationController.getAllPresentations);

// Create a new presentation
router.post('/', PresentationController.createPresentation);

// Get a presentation by ID
router.get('/:id', PresentationController.getPresentationById);

// Update a presentation
router.put('/:id', PresentationController.updatePresentation);

// Delete a presentation
router.delete('/:id', PresentationController.deletePresentation);

// Clone a presentation
router.post('/:id/clone', PresentationController.clonePresentation);

// Export a presentation
router.get('/:id/export/:format', PresentationController.exportPresentation);

// Create export file and get link
router.get('/:id/export-link/:format', PresentationController.createExportFileAndGetLink);

// Download exported file
router.get('/download/:filename', PresentationController.downloadExportedFile);

// Render presentation without saving (server-side rendering)
router.post('/render/:format', PresentationController.renderPresentation);

export default router; 