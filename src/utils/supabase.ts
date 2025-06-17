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
  estimation_result?: string;
  created_at?: string;
}

interface BlogPost {
  id?: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  featured_image_url?: string;
  author_name?: string;
  published?: boolean;
  created_at?: string;
  updated_at?: string;
  tags?: string[];
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
          estimation_result: data.estimation_result,
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

/**
 * Create a new blog post in Supabase
 */
export const createBlogPost = async (data: BlogPost): Promise<BlogPost | null> => {
  if (!supabase) {
    logger.warn('Supabase client not initialized. Blog post not created.');
    return null;
  }

  try {
    const { error, data: insertedData } = await supabase
      .from('blog_posts')
      .insert([
        {
          title: data.title,
          slug: data.slug,
          content: data.content,
          excerpt: data.excerpt,
          featured_image_url: data.featured_image_url,
          author_name: data.author_name || 'Admin',
          published: data.published || false,
          tags: data.tags || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) {
      logger.error('Error creating blog post in Supabase:', error);
      return null;
    }

    logger.info('Successfully created blog post:', data.title);
    return insertedData;
  } catch (error) {
    logger.error('Exception when creating blog post:', error);
    return null;
  }
};

/**
 * Update an existing blog post in Supabase
 */
export const updateBlogPost = async (id: string, data: Partial<BlogPost>): Promise<BlogPost | null> => {
  if (!supabase) {
    logger.warn('Supabase client not initialized. Blog post not updated.');
    return null;
  }

  try {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const { error, data: updatedData } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Error updating blog post in Supabase:', error);
      return null;
    }

    logger.info('Successfully updated blog post:', id);
    return updatedData;
  } catch (error) {
    logger.error('Exception when updating blog post:', error);
    return null;
  }
};

/**
 * Delete a blog post from Supabase
 */
export const deleteBlogPost = async (id: string): Promise<boolean> => {
  if (!supabase) {
    logger.warn('Supabase client not initialized. Blog post not deleted.');
    return false;
  }

  try {
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Error deleting blog post from Supabase:', error);
      return false;
    }

    logger.info('Successfully deleted blog post:', id);
    return true;
  } catch (error) {
    logger.error('Exception when deleting blog post:', error);
    return false;
  }
};

/**
 * Get all blog posts from Supabase
 */
export const getBlogPosts = async (limit?: number, offset?: number): Promise<BlogPost[]> => {
  if (!supabase) {
    logger.warn('Supabase client not initialized. Cannot fetch blog posts.');
    return [];
  }

  try {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching blog posts from Supabase:', error);
      return [];
    }

    logger.info(`Successfully fetched ${data?.length || 0} blog posts`);
    return data || [];
  } catch (error) {
    logger.error('Exception when fetching blog posts:', error);
    return [];
  }
};

/**
 * Get published blog posts only
 */
export const getPublishedPosts = async (limit?: number, offset?: number): Promise<BlogPost[]> => {
  if (!supabase) {
    logger.warn('Supabase client not initialized. Cannot fetch published posts.');
    return [];
  }

  try {
    let query = supabase
      .from('blog_posts')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    if (offset) {
      query = query.range(offset, offset + (limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching published posts from Supabase:', error);
      return [];
    }

    logger.info(`Successfully fetched ${data?.length || 0} published posts`);
    return data || [];
  } catch (error) {
    logger.error('Exception when fetching published posts:', error);
    return [];
  }
};

/**
 * Get a single blog post by slug
 */
export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  if (!supabase) {
    logger.warn('Supabase client not initialized. Cannot fetch blog post.');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error) {
      logger.error('Error fetching blog post by slug from Supabase:', error);
      return null;
    }

    logger.info('Successfully fetched blog post by slug:', slug);
    return data;
  } catch (error) {
    logger.error('Exception when fetching blog post by slug:', error);
    return null;
  }
}; 