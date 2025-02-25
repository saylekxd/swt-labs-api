import { Router } from 'express';
import { OpenAI } from 'openai';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { HealthCheckResponse } from '../types';

const router = Router();

router.get('/health', async (req, res) => {
  try {
    logger.info('Health check requested', {
      headers: req.headers,
      origin: req.get('origin')
    });

    // Check OpenAI API key
    if (!config.openai.apiKey) {
      logger.error('OpenAI API key is missing');
      return res.status(503).json({
        status: 'error',
        message: 'OpenAI API key not configured'
      } as HealthCheckResponse);
    }

    // Test OpenAI client
    const openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    // Test API connection
    const models = await openai.models.list();
    if (!models.data || models.data.length === 0) {
      throw new Error('Failed to connect to OpenAI API');
    }

    return res.status(200).json({
      status: 'ok',
      message: 'Server is healthy',
      openaiConfigured: true,
      timestamp: new Date().toISOString()
    } as HealthCheckResponse);
  } catch (error) {
    logger.error('Health check error:', error);
    
    // Handle OpenAI API errors
    if (error instanceof OpenAI.APIError) {
      return res.status(503).json({
        status: 'error',
        message: 'OpenAI API connection failed: ' + error.message
      } as HealthCheckResponse);
    }

    return res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Server error during health check'
    } as HealthCheckResponse);
  }
});

export default router; 