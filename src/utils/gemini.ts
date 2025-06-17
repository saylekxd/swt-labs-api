import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import { logger } from './logger';
import slugify from 'slugify';
import DOMPurify from 'isomorphic-dompurify';

// Initialize Gemini client
const createGeminiClient = () => {
  if (!config.gemini.apiKey) {
    logger.warn('Gemini API key not configured. AI blog features will not work.');
    return null;
  }

  return new GoogleGenerativeAI(config.gemini.apiKey);
};

const genAI = createGeminiClient();

interface BlogGenerationRequest {
  topic: string;
  keywords?: string[];
  language?: 'en' | 'pl';
  tone?: 'professional' | 'casual' | 'technical';
  length?: 'short' | 'medium' | 'long';
}

interface GeneratedBlogPost {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  slug: string;
}

/**
 * Generate a complete blog post from a topic using Gemini AI
 */
export const generateBlogPost = async (request: BlogGenerationRequest): Promise<GeneratedBlogPost | null> => {
  if (!genAI) {
    logger.warn('Gemini client not initialized. Cannot generate blog post.');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });
    
    const lengthInstructions = {
      short: '500-800 words',
      medium: '800-1200 words', 
      long: '1200-2000 words'
    };

    const prompt = `Create a comprehensive blog post about "${request.topic}" with the following requirements:

LANGUAGE: ${request.language === 'pl' ? 'Polish (Polski)' : 'English'}
TONE: ${request.tone || 'professional'}
LENGTH: ${lengthInstructions[request.length || 'medium']}
KEYWORDS: ${request.keywords?.join(', ') || 'none specified'}

Please provide a response in this EXACT JSON format:
{
  "title": "An engaging, SEO-friendly title",
  "content": "Full blog post content in markdown format with proper headings, paragraphs, and structure",
  "excerpt": "A compelling 2-3 sentence summary",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]
}

Requirements:
- Title should be catchy and SEO-optimized
- Content should be well-structured with H2/H3 headings
- Include practical examples and actionable advice
- Tags should be relevant and useful for categorization
- Write in ${request.language === 'pl' ? 'Polish' : 'English'} language
- Use markdown formatting for better readability`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    logger.info('Generated blog post response from Gemini');
    
    // Parse JSON response
    let parsed;
    try {
      // Clean the response text (remove any markdown code blocks if present)
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleanText);
    } catch (parseError) {
      logger.error('Failed to parse Gemini JSON response:', parseError);
      return null;
    }

    // Sanitize and validate the content
    const sanitizedContent = DOMPurify.sanitize(parsed.content);
    const slug = slugify(parsed.title, { lower: true, strict: true });

    const blogPost: GeneratedBlogPost = {
      title: parsed.title || 'Untitled Post',
      content: sanitizedContent,
      excerpt: parsed.excerpt || '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [], // Limit to 10 tags
      slug
    };

    logger.info('Successfully generated blog post:', { title: blogPost.title, slug });
    return blogPost;

  } catch (error) {
    logger.error('Error generating blog post with Gemini:', error);
    return null;
  }
};

/**
 * Improve existing blog content using Gemini AI
 */
export const improveBlogContent = async (content: string, improvements: string[] = ['grammar', 'clarity', 'seo']): Promise<string | null> => {
  if (!genAI) {
    logger.warn('Gemini client not initialized. Cannot improve content.');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });
    
    const prompt = `Please improve the following blog content by focusing on: ${improvements.join(', ')}.

Original content:
${content}

Instructions:
- Fix any grammar and spelling errors
- Improve clarity and readability
- Enhance SEO with better structure and keywords
- Maintain the original tone and style
- Keep the same length approximately
- Return only the improved content, no explanations

Improved content:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const improvedContent = response.text().trim();
    
    logger.info('Successfully improved blog content');
    return DOMPurify.sanitize(improvedContent);

  } catch (error) {
    logger.error('Error improving blog content with Gemini:', error);
    return null;
  }
};

/**
 * Generate a catchy title from blog content
 */
export const generateBlogTitle = async (content: string): Promise<string | null> => {
  if (!genAI) {
    logger.warn('Gemini client not initialized. Cannot generate title.');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });
    
    const prompt = `Based on the following blog content, generate 5 catchy, SEO-friendly titles. Make them engaging and click-worthy.

Content:
${content.substring(0, 1000)}...

Return only the titles, one per line:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const titles = response.text().trim().split('\n');
    
    // Return the first title (usually the best one)
    const bestTitle = titles[0]?.replace(/^\d+\.\s*/, '').trim() || 'Untitled Post';
    
    logger.info('Successfully generated blog title:', bestTitle);
    return bestTitle;

  } catch (error) {
    logger.error('Error generating blog title with Gemini:', error);
    return null;
  }
};

/**
 * Generate excerpt from blog content
 */
export const generateBlogExcerpt = async (content: string): Promise<string | null> => {
  if (!genAI) {
    logger.warn('Gemini client not initialized. Cannot generate excerpt.');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });
    
    const prompt = `Create a compelling 2-3 sentence excerpt for this blog post that will make people want to read more:

${content.substring(0, 1000)}...

The excerpt should:
- Be 150-200 characters
- Hook the reader's interest
- Summarize the main value proposition
- Be engaging and professional

Excerpt:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const excerpt = response.text().trim();
    
    logger.info('Successfully generated blog excerpt');
    return excerpt;

  } catch (error) {
    logger.error('Error generating blog excerpt with Gemini:', error);
    return null;
  }
};

/**
 * Generate relevant tags from blog content
 */
export const generateBlogTags = async (content: string): Promise<string[]> => {
  if (!genAI) {
    logger.warn('Gemini client not initialized. Cannot generate tags.');
    return [];
  }

  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });
    
    const prompt = `Analyze this blog content and generate 5-8 relevant tags for categorization and SEO:

${content.substring(0, 1000)}...

Requirements:
- Use single words or short phrases
- Make them relevant to the content
- Include both technical and general terms
- Separate with commas
- Keep them lowercase

Tags:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const tagsText = response.text().trim();
    
    const tags = tagsText
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0)
      .slice(0, 8); // Limit to 8 tags
    
    logger.info('Successfully generated blog tags:', tags);
    return tags;

  } catch (error) {
    logger.error('Error generating blog tags with Gemini:', error);
    return [];
  }
};

/**
 * Translate blog post content to another language
 */
export const translateBlogPost = async (content: string, targetLanguage: 'en' | 'pl'): Promise<string | null> => {
  if (!genAI) {
    logger.warn('Gemini client not initialized. Cannot translate content.');
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({ model: config.gemini.model });
    
    const languageNames = {
      en: 'English',
      pl: 'Polish (Polski)'
    };

    const prompt = `Translate the following blog content to ${languageNames[targetLanguage]}. 
Maintain the same tone, style, and markdown formatting. Keep technical terms accurate.

Content to translate:
${content}

Translated content:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const translatedContent = response.text().trim();
    
    logger.info(`Successfully translated blog content to ${targetLanguage}`);
    return DOMPurify.sanitize(translatedContent);

  } catch (error) {
    logger.error('Error translating blog content with Gemini:', error);
    return null;
  }
}; 