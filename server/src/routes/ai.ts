import { Router } from 'express';
import { AIController } from '../controllers/ai';

const router = Router();

// AI PPT大纲生成
router.post('/aippt_outline', AIController.generateOutline);

// AI PPT生成
router.post('/aippt', AIController.generatePPT);

// 火山引擎生成图片
router.post('/volcengine/image', AIController.generateVolcengineImage);

export default router; 