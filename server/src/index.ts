import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import presentationRoutes from './routes/presentations';
import toolsRoutes from './routes/tools';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// 提供静态文件服务
const publicDir = path.join(__dirname, '../public');
app.use('/assets', express.static(path.join(publicDir, 'assets')));

// Routes
app.use('/api/presentations', presentationRoutes);
app.use('/api/tools', toolsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Assets available at http://localhost:${PORT}/assets`);
  console.log(`API available at http://localhost:${PORT}/api`);
}); 