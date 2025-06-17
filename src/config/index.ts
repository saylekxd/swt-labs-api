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
  } satisfies CorsOptions,
  supabase: {
    url: process.env.SUPABASE_URL || '',
    key: process.env.SUPABASE_ANON_KEY || '',
    emailsTable: process.env.SUPABASE_EMAILS_TABLE || 'user_emails'
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: 'gemini-1.5-flash' // Free tier model
  },
  blog: {
    adminKey: process.env.BLOG_ADMIN_KEY || ''
  }
};

// Validate required configuration
export const validateConfig = () => {
  if (!config.openai.apiKey) {
    throw new Error('OpenAI API key is not configured');
  }
  
  // Only validate Supabase config if in production to avoid breaking local dev
  if (process.env.NODE_ENV === 'production') {
    if (!config.supabase.url) {
      throw new Error('Supabase URL is not configured');
    }
    if (!config.supabase.key) {
      throw new Error('Supabase Anon Key is not configured');
    }
  }
  
  // Validate Gemini API key for blog functionality
  if (!config.gemini.apiKey) {
    console.warn('Gemini API key is not configured. Blog AI features will not work.');
  }
  
  // Validate blog admin key
  if (!config.blog.adminKey) {
    console.warn('Blog admin key is not configured. Admin features will not work.');
  }
}; 