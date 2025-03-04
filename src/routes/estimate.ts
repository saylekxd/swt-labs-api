import { Router } from 'express';
import { OpenAI } from 'openai';
import { config } from '../config';
import { logger } from '../utils/logger';
import type { EstimationRequest, EstimationResponse, ErrorResponse } from '../types';

const router = Router();

router.post('/estimate', async (req, res) => {
  logger.info('Received estimation request');
  
  try {
    const { projectName, description, timeline, selectedFeatures, projectType, complexity } = req.body as EstimationRequest;

    // Validate required fields
    if (!projectName || !description || !timeline || !projectType) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['projectName', 'description', 'timeline', 'projectType']
      } as ErrorResponse);
    }

    logger.info('Processing request for:', {
      projectName,
      projectType,
      timeline,
      complexity,
      features: selectedFeatures?.length || 0
    });

    const prompt = `Please provide a project cost estimation for the following software project:
    Project Name: ${projectName}
    Project Type: ${projectType}
    Description: ${description}
    Timeline: ${timeline}
    Selected Features: ${selectedFeatures?.join(', ') || 'None'}
    Complexity Level: ${complexity}%
    
    Please provide short, concise cost estimation range in USD, considering the project scope, timeline, selected features, and complexity level. Include a brief explanation of the estimation.`;

    const openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: "system",
          content: "The response should be in the format of 'Estimated Cost: $10,000 - $20,000'. That's all."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: config.openai.temperature,
      max_tokens: config.openai.maxTokens
    });

    const estimation = completion.choices[0].message.content;
    logger.info('Generated estimation:', estimation);
    
    res.json({ estimation } as EstimationResponse);
  } catch (error) {
    logger.error('Error processing estimation:', error);
    
    if (error instanceof OpenAI.APIError) {
      const status = error.status || 500;
      const message = error.message || 'OpenAI API Error';
      
      // Map common OpenAI error types to appropriate responses
      switch (error.type) {
        case 'invalid_request_error':
          return res.status(400).json({ error: message } as ErrorResponse);
        case 'rate_limit_error':
          return res.status(429).json({ error: 'Rate limit exceeded. Please try again later.' } as ErrorResponse);
        case 'authentication_error':
          return res.status(401).json({ error: 'OpenAI API authentication failed' } as ErrorResponse);
        default:
          return res.status(status).json({ error: message } as ErrorResponse);
      }
    }

    res.status(500).json({ 
      error: 'Failed to generate estimation',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ErrorResponse);
  }
});

export default router; 