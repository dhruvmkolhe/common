import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'glassmorphic-cyber-secret-key-987654321';

/**
 * Strict authentication middleware.
 * Rejects requests without a valid token.
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Optional authentication middleware.
 * Attaches user to request if token is valid, but does not block if absent.
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email };
  } catch (err) {
    // Gracefully ignore error and treat as guest
    console.debug('Optional auth failed:', err.message);
  }
  
  next();
}
