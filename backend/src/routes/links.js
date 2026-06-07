import { Router } from 'express';
import { shorten, getLinks, updateLink, deleteLink, getStats } from '../controllers/linkController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { shortenLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Create short link: Optional Auth (supports guest users), Rate limited
router.post('/shorten', optionalAuth, shortenLimiter, shorten);

// List links: Requires Auth
router.get('/', requireAuth, getLinks);

// Update link configuration: Requires Auth
router.put('/:id', requireAuth, updateLink);

// Delete link: Requires Auth
router.delete('/:id', requireAuth, deleteLink);

// Get link analytics: Requires Auth
router.get('/:id/stats', requireAuth, getStats);

export default router;
