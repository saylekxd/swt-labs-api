import { Router } from 'express';
import { OpenAI } from 'openai';
import { config } from '../config';
import { logger } from '../utils/logger';
import { saveEmailToSupabase } from '../utils/supabase';
import type { EstimationRequest, EstimationResponse, ErrorResponse } from '../types';

const router = Router();

router.post('/estimate', async (req, res) => {
  logger.info('Received estimation request');
  
  try {
    const { projectName, description, timeline, selectedFeatures, projectType, complexity, email } = req.body as EstimationRequest;

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

    // Note: Email will be saved after estimation is generated

    const prompt = `Please provide a project cost estimation for the following software project:
    Project Name: ${projectName}
    Project Type: ${projectType}
    Description: ${description}
    Timeline: ${timeline}
    Selected Features: ${selectedFeatures?.join(', ') || 'None'}
    Complexity Level: ${complexity}%
    
    Calculate your standard estimated price, then reduce it by approximately 70%.  
    Important: The final estimated cost should never be lower than 6,000 PLN or higher than 34,000 PLN.

    Provide the response in Polish language in the following format (the price should change based on the project complexity):

    Estimated Cost: 10,000 PLN - 15,000 PLN `;

    const openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });

    const completion = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: "system",
          content: "The response should be in the format of 'Szacowany koszt: [estimated cost range] PLN - [estimated cost range] PLN.' and in should be different based on the project complexity. The final estimated cost should never be lower than 6,000 PLN or higher than 34,000 PLN. Never use any other format. That's all."
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
    
    // Save email and estimation result to Supabase if provided
    if (email && !res.headersSent) {
      saveEmailToSupabase({
        email,
        project_name: projectName,
        project_type: projectType,
        features: selectedFeatures,
        complexity,
        estimation_result: estimation || undefined
      }).catch(error => {
        // Just log the error but don't fail the request
        logger.error('Failed to save email and estimation to Supabase:', error);
      });
    }
    
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

// Add new API route for just saving emails
router.post('/subscribe', async (req, res) => {
  try {
    const { email, projectName, projectType, selectedFeatures, complexity, estimationResult } = req.body;
    
    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({
        error: 'Invalid email address',
        required: ['email']
      } as ErrorResponse);
    }
    
    // Save to Supabase
    const success = await saveEmailToSupabase({
      email,
      project_name: projectName || 'No project name',
      project_type: projectType || 'No project type',
      features: selectedFeatures || [],
      complexity: complexity || 0,
      estimation_result: estimationResult
    });
    
    if (success) {
      return res.status(200).json({
        status: 'success',
        message: 'Email saved successfully'
      });
    } else {
      return res.status(500).json({
        error: 'Failed to save email'
      } as ErrorResponse);
    }
  } catch (error) {
    logger.error('Error processing subscription:', error);
    
    res.status(500).json({ 
      error: 'Failed to save email',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ErrorResponse);
  }
});

export default router; 