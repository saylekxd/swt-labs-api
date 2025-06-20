import { Router } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';
import { checkAdminAccess, checkAdminOptional, AuthenticatedRequest } from '../middleware/adminAuth';
import {
  createBlogPost,
  updateBlogPost,
  deleteBlogPost,
  getBlogPosts,
  getPublishedPosts,
  getBlogPostBySlug
} from '../utils/supabase';
import {
  generateBlogPost,
  improveBlogContent,
  generateBlogTitle,
  generateBlogExcerpt,
  generateBlogTags,
  translateBlogPost
} from '../utils/gemini';
import type { Request, Response } from 'express';

const router = Router();

// Public routes (no authentication required)

/**
 * GET /api/blog - Get published blog posts (public)
 */
router.get('/', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    logger.info(`Fetching published blog posts (limit: ${limit}, offset: ${offset})`);
    
    const posts = await getPublishedPosts(limit, offset);
    
    res.json({
      success: true,
      data: posts,
      pagination: {
        limit,
        offset,
        count: posts.length
      }
    });
  } catch (error) {
    logger.error('Error fetching published blog posts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog posts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/blog/:slug - Get a specific blog post by slug (public)
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    logger.info(`Fetching blog post by slug: ${slug}`);
    
    const post = await getBlogPostBySlug(slug);
    
    if (!post) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    // Only return published posts to public (unless admin)
    if (!post.published) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found'
      });
    }

    res.json({
      success: true,
      data: post
    });
  } catch (error) {
    logger.error('Error fetching blog post by slug:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Admin routes (authentication required)

/**
 * GET /api/blog/admin/posts - Get all blog posts (admin only)
 */
router.get('/admin/posts', checkAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    logger.info(`Admin fetching all blog posts (limit: ${limit}, offset: ${offset})`);
    
    const posts = await getBlogPosts(limit, offset);
    
    res.json({
      success: true,
      data: posts,
      pagination: {
        limit,
        offset,
        count: posts.length
      }
    });
  } catch (error) {
    logger.error('Error fetching all blog posts for admin:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch blog posts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/blog/admin/create - Create new blog post (admin only)
 */
router.post('/admin/create', checkAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, slug, content, excerpt, featured_image_url, published, status, tags } = req.body;

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
        required: ['title', 'content']
      });
    }

    logger.info(`Admin creating new blog post: ${title}`);
    
    const blogPost = await createBlogPost({
      title,
      slug: slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      content,
      excerpt,
      featured_image_url,
      published: typeof published === 'boolean' ? published : status === 'published',
      tags: tags || []
    });

    if (!blogPost) {
      return res.status(500).json({
        success: false,
        error: 'Failed to create blog post'
      });
    }

    res.status(201).json({
      success: true,
      data: blogPost,
      message: 'Blog post created successfully'
    });
  } catch (error) {
    logger.error('Error creating blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create blog post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/blog/admin/:id - Update blog post (admin only)
 */
router.put('/admin/:id', checkAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status: updStatus, published: updPublished, published_at, ...other } = req.body;
    // Convert status/published to consistent boolean
    const updateData = {
      ...other,
      published: typeof updPublished === 'boolean' ? updPublished : updStatus === 'published'
    };

    logger.info(`Admin updating blog post: ${id}`);
    
    const updatedPost = await updateBlogPost(id, updateData);

    if (!updatedPost) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found or failed to update'
      });
    }

    res.json({
      success: true,
      data: updatedPost,
      message: 'Blog post updated successfully'
    });
  } catch (error) {
    logger.error('Error updating blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update blog post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/blog/admin/:id - Delete blog post (admin only)
 */
router.delete('/admin/:id', checkAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    logger.info(`Admin deleting blog post: ${id}`);
    
    const success = await deleteBlogPost(id);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Blog post not found or failed to delete'
      });
    }

    res.json({
      success: true,
      message: 'Blog post deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete blog post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// AI-powered routes (admin only)

/**
 * POST /api/blog/ai/generate - Generate blog post from topic (admin only)
 */
router.post('/ai/generate', checkAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { topic, keywords, language, tone, length } = req.body;

    if (!topic) {
      return res.status(400).json({
        success: false,
        error: 'Topic is required',
        required: ['topic']
      });
    }

    logger.info(`Admin generating blog post for topic: ${topic}`);
    
    const generatedPost = await generateBlogPost({
      topic,
      keywords,
      language: language || 'en',
      tone: tone || 'professional',
      length: length || 'medium'
    });

    if (!generatedPost) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate blog post. Please check your Gemini API configuration.'
      });
    }

    res.json({
      success: true,
      data: generatedPost,
      message: 'Blog post generated successfully'
    });
  } catch (error) {
    logger.error('Error generating blog post:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate blog post',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/blog/ai/improve - Improve existing content (admin only)
 */
router.post('/ai/improve', checkAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, improvements } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
        required: ['content']
      });
    }

    logger.info('Admin improving blog content with AI');
    
    const improvedContent = await improveBlogContent(content, improvements);

    if (!improvedContent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to improve content. Please check your Gemini API configuration.'
      });
    }

    res.json({
      success: true,
      data: {
        original: content,
        improved: improvedContent
      },
      message: 'Content improved successfully'
    });
  } catch (error) {
    logger.error('Error improving content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to improve content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/blog/ai/title - Generate title from content (admin only)
 */
router.post('/ai/title', checkAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
        required: ['content']
      });
    }

    logger.info('Admin generating title with AI');
    
    const title = await generateBlogTitle(content);

    if (!title) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate title. Please check your Gemini API configuration.'
      });
    }

    res.json({
      success: true,
      data: { title },
      message: 'Title generated successfully'
    });
  } catch (error) {
    logger.error('Error generating title:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate title',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/blog/ai/excerpt - Generate excerpt from content (admin only)
 */
router.post('/ai/excerpt', checkAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
        required: ['content']
      });
    }

    logger.info('Admin generating excerpt with AI');
    
    const excerpt = await generateBlogExcerpt(content);

    if (!excerpt) {
      return res.status(500).json({
        success: false,
        error: 'Failed to generate excerpt. Please check your Gemini API configuration.'
      });
    }

    res.json({
      success: true,
      data: { excerpt },
      message: 'Excerpt generated successfully'
    });
  } catch (error) {
    logger.error('Error generating excerpt:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate excerpt',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/blog/ai/tags - Generate tags from content (admin only)
 */
router.post('/ai/tags', checkAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: 'Content is required',
        required: ['content']
      });
    }

    logger.info('Admin generating tags with AI');
    
    const tags = await generateBlogTags(content);

    res.json({
      success: true,
      data: { tags },
      message: 'Tags generated successfully'
    });
  } catch (error) {
    logger.error('Error generating tags:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate tags',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/blog/ai/translate - Translate content (admin only)
 */
router.post('/ai/translate', checkAdminAccess, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { content, targetLanguage } = req.body;

    if (!content || !targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'Content and target language are required',
        required: ['content', 'targetLanguage']
      });
    }

    logger.info(`Admin translating content to ${targetLanguage}`);
    
    const translatedContent = await translateBlogPost(content, targetLanguage);

    if (!translatedContent) {
      return res.status(500).json({
        success: false,
        error: 'Failed to translate content. Please check your Gemini API configuration.'
      });
    }

    res.json({
      success: true,
      data: {
        original: content,
        translated: translatedContent,
        targetLanguage
      },
      message: 'Content translated successfully'
    });
  } catch (error) {
    logger.error('Error translating content:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to translate content',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 