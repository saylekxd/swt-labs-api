import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from './logger';

// Initialize Supabase client
const createSupabaseClient = () => {
  if (!config.supabase.url || !config.supabase.key) {
    logger.warn('Supabase credentials not configured. Email saving functionality will not work.');
    return null;
  }

  return createClient(config.supabase.url, config.supabase.key);
};

const supabase = createSupabaseClient();

interface EmailEntry {
  email: string;
  project_name: string;
  project_type: string;
  features?: string[];
  complexity?: number;
  created_at?: string;
}

/**
 * Save user email and project information to Supabase
 */
export const saveEmailToSupabase = async (data: EmailEntry): Promise<boolean> => {
  if (!supabase) {
    logger.warn('Supabase client not initialized. Email not saved.');
    return false;
  }

  try {
    const { error } = await supabase
      .from(config.supabase.emailsTable)
      .insert([
        {
          email: data.email,
          project_name: data.project_name,
          project_type: data.project_type,
          features: data.features,
          complexity: data.complexity,
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      logger.error('Error saving email to Supabase:', error);
      return false;
    }

    logger.info('Successfully saved email to Supabase:', data.email);
    return true;
  } catch (error) {
    logger.error('Exception when saving email to Supabase:', error);
    return false;
  }
}; 