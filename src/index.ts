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

// Log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    headers: req.headers,
    query: req.query,
    body: req.method === 'POST' ? req.body : undefined
  });
  next();
});

// Pre-flight requests
app.options('*', cors(config.cors));

// Basic root route for testing
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'SWT Labs API is running',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api', healthRoutes);
app.use('/api', estimateRoutes);

// Start server
app.listen(config.port, () => {
  logger.info(`🚀 Server running on port ${config.port}`);
  logger.info(`📡 OpenAI API Key status: ${config.openai.apiKey ? '✅ Configured' : '❌ Missing'}`);
}); 