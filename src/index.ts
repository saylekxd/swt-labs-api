import express from 'express';
import cors from 'cors';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import healthRoutes from './routes/health';
import estimateRoutes from './routes/estimate';

// Validate configuration
try {
  validateConfig();
} catch (error) {
  logger.error('Configuration error:', error);
  process.exit(1);
}

const app = express();

// Configure middleware
app.use(cors(config.cors));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    headers: req.headers,
    body: req.body
  });
  next();
});

// Pre-flight requests
app.options('*', cors(config.cors));

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Global error handler:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message || 'Unknown error occurred'
  });
  next();
});

// Routes
app.use('/api', healthRoutes);
app.use('/api', estimateRoutes);

// Start server
app.listen(config.port, () => {
  logger.info(`🚀 Server running on port ${config.port}`);
  logger.info(`📡 OpenAI API Key status: ${config.openai.apiKey ? '✅ Configured' : '❌ Missing'}`);
}); 