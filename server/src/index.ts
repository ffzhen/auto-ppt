import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import presentationRoutes from './routes/presentations';
import toolsRoutes from './routes/tools';
import aiRouter from './routes/ai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 提供静态文件服务
const publicDir = path.join(__dirname, '../public');
app.use('/assets', express.static(path.join(publicDir, 'assets')));

// Serve the SSR demo page
app.get('/ssr-demo', (req, res) => {
  res.sendFile(path.join(__dirname, 'views/ssr-demo.html'));
});

// Routes
app.use('/api/presentations', presentationRoutes);
app.use('/api/tools', toolsRoutes);
app.use('/api/ai', aiRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Assets available at http://localhost:${PORT}/assets`);
  console.log(`API available at http://localhost:${PORT}/api`);
}); 