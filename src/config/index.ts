import dotenv from 'dotenv';
import path from 'path';
import type { CorsOptions } from 'cors';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT || 5001,
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    maxTokens: 500,
    temperature: 0.7
  },
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || '', 'https://*.netlify.app'] // Allow Netlify domains
      : true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    credentials: true
  } satisfies CorsOptions
};

// Validate required configuration
export const validateConfig = () => {
  if (!config.openai.apiKey) {
    throw new Error('OpenAI API key is not configured');
  }
}; 