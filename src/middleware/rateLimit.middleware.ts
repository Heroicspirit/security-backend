import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Rate limit configuration for different endpoint types
export const rateLimitConfig = {
  // General API rate limit
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Strict rate limit for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Rate limit for sensitive operations (password reset, etc.)
  sensitive: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 requests per hour
    message: 'Too many sensitive operations attempted, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Rate limit for API endpoints that require authentication
  authenticated: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Limit each authenticated user to 200 requests per windowMs
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return (req as any).user?.id || req.ip;
    },
  },
};

// Create rate limiters
export const generalRateLimit = rateLimit(rateLimitConfig.general);
export const authRateLimit = rateLimit(rateLimitConfig.auth);
export const sensitiveRateLimit = rateLimit(rateLimitConfig.sensitive);
export const authenticatedRateLimit = rateLimit(rateLimitConfig.authenticated);

// Custom rate limiter with IP-based blocking
export const createCustomRateLimit = (options: {
  windowMs: number;
  max: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    skipSuccessfulRequests: options.skipSuccessfulRequests || false,
    skipFailedRequests: options.skipFailedRequests || false,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil(options.windowMs / 1000),
      });
    },
  });
};

// Request throttling middleware for expensive operations
export const throttleRequests = (maxConcurrent: number = 10) => {
  let activeRequests = 0;
  const queue: Array<(next: NextFunction) => void> = [];

  const processQueue = () => {
    if (queue.length > 0) {
      const nextRequest = queue.shift();
      if (nextRequest) {
        nextRequest(() => {}); // Execute the queued request
      }
    }
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (activeRequests < maxConcurrent) {
      activeRequests++;
      next();
      
      // Decrement active requests when response is sent
      res.on('finish', () => {
        activeRequests--;
        processQueue();
      });
    } else {
      // Add to queue
      queue.push((nextFn: NextFunction) => {
        activeRequests++;
        nextFn();
        
        res.on('finish', () => {
          activeRequests--;
          processQueue();
        });
      });
      
      // Send 503 Service Unavailable if queue is too long
      if (queue.length > 50) {
        res.status(503).json({
          success: false,
          message: 'Server is busy, please try again later',
        });
      }
    }
  };
};

// Adaptive rate limiting based on server load
export const adaptiveRateLimit = (req: Request, res: Response, next: NextFunction) => {
  const cpuUsage = process.cpuUsage();
  const memoryUsage = process.memoryUsage();
  
  // Adjust rate limit based on system resources
  const loadFactor = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
  
  if (loadFactor > 80) {
    // High load - stricter rate limiting
    return createCustomRateLimit({
      windowMs: 15 * 60 * 1000,
      max: 50,
    })(req, res, next);
  }
  
  // Normal load - standard rate limiting
  next();
};
