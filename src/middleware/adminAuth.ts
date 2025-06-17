import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  isAdmin?: boolean;
  session?: any; // Express session (add proper session types if needed)
}

/**
 * Middleware to check admin access via secret key
 * Supports both query parameter and session-based authentication
 */
export const checkAdminAccess = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Check for admin key in query parameters (for initial access)
    const queryKey = req.query.key as string;
    
    // Check for admin key in session (for subsequent requests)
    const sessionKey = (req.session as any)?.adminKey;
    const sessionExpires = (req.session as any)?.adminExpires;

    // Validate admin key from environment
    if (!config.blog.adminKey) {
      logger.warn('Blog admin key not configured');
      return res.status(500).json({ 
        error: 'Admin authentication not configured',
        code: 'ADMIN_NOT_CONFIGURED'
      });
    }

    // Check query parameter first (for initial authentication)
    if (queryKey) {
      if (queryKey === config.blog.adminKey) {
        // Store admin session for 24 hours
        (req.session as any).adminKey = queryKey;
        (req.session as any).adminExpires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
        
        req.isAdmin = true;
        logger.info('Admin authenticated via query parameter');
        return next();
      } else {
        logger.warn('Invalid admin key provided in query parameter');
        return res.status(401).json({ 
          error: 'Invalid admin key',
          code: 'INVALID_ADMIN_KEY'
        });
      }
    }

    // Check session-based authentication
    if (sessionKey && sessionExpires) {
      if (sessionKey === config.blog.adminKey && Date.now() < sessionExpires) {
        req.isAdmin = true;
        logger.debug('Admin authenticated via session');
        return next();
      } else if (Date.now() >= sessionExpires) {
        // Session expired, clear it
        delete (req.session as any).adminKey;
        delete (req.session as any).adminExpires;
        logger.info('Admin session expired');
      }
    }

    // No valid authentication found
    logger.warn('Admin access denied - no valid authentication');
    return res.status(401).json({ 
      error: 'Admin access required. Please use the admin URL with the correct key.',
      code: 'ADMIN_ACCESS_REQUIRED'
    });

  } catch (error) {
    logger.error('Error in admin authentication middleware:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};

/**
 * Optional middleware to check if user is admin (doesn't block request)
 * Useful for endpoints that behave differently for admins vs public users
 */
export const checkAdminOptional = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const queryKey = req.query.key as string;
    const sessionKey = (req.session as any)?.adminKey;
    const sessionExpires = (req.session as any)?.adminExpires;

    if (config.blog.adminKey) {
      // Check query parameter
      if (queryKey === config.blog.adminKey) {
        req.isAdmin = true;
        (req.session as any).adminKey = queryKey;
        (req.session as any).adminExpires = Date.now() + (24 * 60 * 60 * 1000);
      }
      // Check session
      else if (sessionKey === config.blog.adminKey && Date.now() < sessionExpires) {
        req.isAdmin = true;
      }
    }

    next();
  } catch (error) {
    logger.error('Error in optional admin check:', error);
    next(); // Continue even if there's an error
  }
}; 