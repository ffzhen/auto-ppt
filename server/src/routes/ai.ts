import { Router } from 'express';
import { AIController } from '../controllers/ai';

const router = Router();

// AI PPT大纲生成
router.post('/aippt_outline', AIController.generateOutline);

// AI PPT生成
router.post('/aippt', AIController.generatePPT);

export default router; 