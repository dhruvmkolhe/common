import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { redisClient, isConnected as isRedisConnected } from '../config/redis.js';
import { generateShortCode, isValidAlias } from '../utils/base62.js';
import { getUrlMetadata } from '../utils/metadata.js';

// Simple blacklist of malicious or invalid domains
const DOMAIN_BLACKLIST = [
  'malicious.com',
  'phishing.net',
  'virus-download.org',
  'localhost:5000', // Prevent infinite redirect loops if matching backend host
  'localhost:3000'
];

/**
 * Helper to validate standard URL syntax.
 */
function isValidUrl(string) {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

/**
 * Shortens a URL (single link).
 */
export async function shorten(req, res) {
  const { longUrl, customAlias, expiresAt, password } = req.body;
  const userId = req.user ? req.user.id : null;

  if (!longUrl) {
    return res.status(400).json({ error: 'Original URL (longUrl) is required.' });
  }

  if (!isValidUrl(longUrl)) {
    return res.status(400).json({ error: 'Invalid URL format. Must include http:// or https://' });
  }

  // Validate blacklist
  try {
    const parsedUrl = new URL(longUrl);
    const hostname = parsedUrl.hostname.toLowerCase();
    
    if (DOMAIN_BLACKLIST.some(domain => hostname === domain || hostname.endsWith('.' + domain))) {
      return res.status(400).json({ error: 'This domain is blacklisted due to security reasons.' });
    }
  } catch (err) {
    return res.status(400).json({ error: 'Invalid URL domain structure.' });
  }

  let code = customAlias ? customAlias.trim() : '';

  // Handle Custom Alias Validation
  if (code) {
    if (!isValidAlias(code)) {
      return res.status(400).json({ 
        error: 'Custom alias must be between 3 and 30 characters and only contain letters, numbers, hyphens, or underscores.' 
      });
    }

    // Check if code is already taken
    const existing = await prisma.link.findUnique({ where: { code } });
    if (existing) {
      return res.status(400).json({ error: 'This custom alias is already in use. Please try another.' });
    }
  } else {
    // Generate an automatic collision-free short code
    let attempts = 0;
    while (attempts < 5) {
      const generated = generateShortCode(6);
      const existing = await prisma.link.findUnique({ where: { code: generated } });
      if (!existing) {
        code = generated;
        break;
      }
      attempts++;
    }

    if (!code) {
      return res.status(500).json({ error: 'Failed to generate a unique short link. Please try again.' });
    }
  }

  // Handle expiration validation
  let expirationDate = null;
  if (expiresAt) {
    expirationDate = new Date(expiresAt);
    if (isNaN(expirationDate.getTime())) {
      return res.status(400).json({ error: 'Invalid expiration date format.' });
    }
    if (expirationDate <= new Date()) {
      return res.status(400).json({ error: 'Expiration date must be in the future.' });
    }
  }

  // Handle link password hashing
  let passwordHash = null;
  if (password && password.trim() !== '') {
    const salt = await bcrypt.genSalt(10);
    passwordHash = await bcrypt.hash(password, salt);
  }

  try {
    // Crawl metadata for previews
    const metadata = await getUrlMetadata(longUrl);

    // Save to Database
    const link = await prisma.link.create({
      data: {
        code,
        longUrl,
        passwordHash,
        expiresAt: expirationDate,
        userId
      }
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const responsePayload = {
      id: link.id,
      code: link.code,
      longUrl: link.longUrl,
      shortUrl: `${baseUrl}/${link.code}`,
      expiresAt: link.expiresAt,
      isEnabled: link.isEnabled,
      passwordProtected: !!link.passwordHash,
      createdAt: link.createdAt,
      metadata
    };

    return res.status(201).json(responsePayload);
  } catch (err) {
    console.error('Shorten error:', err);
    return res.status(500).json({ error: 'Internal server error while saving short link.' });
  }
}

/**
 * List the links belonging to the authenticated user.
 * Supports searching by longUrl or code, and filtering by active status.
 */
export async function getLinks(req, res) {
  const userId = req.user.id;
  const { search, filter } = req.query;

  try {
    // Construct database filter query
    const whereClause = { userId };

    if (search) {
      whereClause.OR = [
        { longUrl: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (filter === 'active') {
      whereClause.isEnabled = true;
      whereClause.OR = [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } }
      ];
    } else if (filter === 'disabled') {
      whereClause.isEnabled = false;
    } else if (filter === 'expired') {
      whereClause.expiresAt = { lt: new Date() };
    }

    const links = await prisma.link.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { analytics: true }
        }
      }
    });

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    const formattedLinks = links.map(link => ({
      id: link.id,
      code: link.code,
      longUrl: link.longUrl,
      shortUrl: `${baseUrl}/${link.code}`,
      expiresAt: link.expiresAt,
      isEnabled: link.isEnabled,
      passwordProtected: !!link.passwordHash,
      createdAt: link.createdAt,
      clicks: link._count.analytics
    }));

    return res.json({ links: formattedLinks });
  } catch (err) {
    console.error('GetLinks error:', err);
    return res.status(500).json({ error: 'Internal server error fetching your links.' });
  }
}

/**
 * Update link configurations (long URL, expiresAt, password, active toggle).
 * Invalidates the Redis Cache to apply updates instantly.
 */
export async function updateLink(req, res) {
  const userId = req.user.id;
  const { id } = req.params;
  const { longUrl, expiresAt, isEnabled, password } = req.body;

  try {
    const existingLink = await prisma.link.findFirst({
      where: { id, userId }
    });

    if (!existingLink) {
      return res.status(404).json({ error: 'Short link not found or unauthorized.' });
    }

    const updateData = {};

    if (longUrl !== undefined) {
      if (!isValidUrl(longUrl)) {
        return res.status(400).json({ error: 'Invalid URL format.' });
      }
      updateData.longUrl = longUrl;
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        updateData.expiresAt = null;
      } else {
        const expirationDate = new Date(expiresAt);
        if (isNaN(expirationDate.getTime())) {
          return res.status(400).json({ error: 'Invalid expiration date format.' });
        }
        updateData.expiresAt = expirationDate;
      }
    }

    if (isEnabled !== undefined) {
      updateData.isEnabled = !!isEnabled;
    }

    if (password !== undefined) {
      if (password === null || password.trim() === '') {
        updateData.passwordHash = null; // Clear password
      } else {
        const salt = await bcrypt.genSalt(10);
        updateData.passwordHash = await bcrypt.hash(password, salt);
      }
    }

    const updated = await prisma.link.update({
      where: { id },
      data: updateData
    });

    // Invalidate Redis Cache instantly
    if (isRedisConnected) {
      await redisClient.del(`link:${existingLink.code}`);
      console.log(`Cache invalidated for: link:${existingLink.code}`);
    }

    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    return res.json({
      message: 'Short link updated successfully.',
      link: {
        id: updated.id,
        code: updated.code,
        longUrl: updated.longUrl,
        shortUrl: `${baseUrl}/${updated.code}`,
        expiresAt: updated.expiresAt,
        isEnabled: updated.isEnabled,
        passwordProtected: !!updated.passwordHash,
        updatedAt: updated.updatedAt
      }
    });
  } catch (err) {
    console.error('UpdateLink error:', err);
    return res.status(500).json({ error: 'Internal server error updating link settings.' });
  }
}

/**
 * Delete a link.
 * Invalidates the Redis Cache.
 */
export async function deleteLink(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const existingLink = await prisma.link.findFirst({
      where: { id, userId }
    });

    if (!existingLink) {
      return res.status(404).json({ error: 'Short link not found or unauthorized.' });
    }

    await prisma.link.delete({ where: { id } });

    // Invalidate Redis cache
    if (isRedisConnected) {
      await redisClient.del(`link:${existingLink.code}`);
      console.log(`Cache deleted for: link:${existingLink.code}`);
    }

    return res.json({ message: 'Short link deleted successfully.' });
  } catch (err) {
    console.error('DeleteLink error:', err);
    return res.status(500).json({ error: 'Internal server error deleting link.' });
  }
}

/**
 * Compile detailed click analytics for a specific link.
 */
export async function getStats(req, res) {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const link = await prisma.link.findFirst({
      where: { id, userId }
    });

    if (!link) {
      return res.status(404).json({ error: 'Short link not found or unauthorized.' });
    }

    const analytics = await prisma.analytic.findMany({
      where: { linkId: id },
      orderBy: { clickedAt: 'asc' }
    });

    // Aggregate click telemetry
    const totalClicks = analytics.length;
    const clicksOverTime = {};
    const devices = { Desktop: 0, Mobile: 0, Tablet: 0 };
    const browsers = {};
    const countries = {};
    const cities = {};
    const referrers = {};

    analytics.forEach(click => {
      // 1. Clicks Over Time (YYYY-MM-DD)
      const dateStr = new Date(click.clickedAt).toISOString().split('T')[0];
      clicksOverTime[dateStr] = (clicksOverTime[dateStr] || 0) + 1;

      // 2. Devices
      const dev = click.device;
      if (devices[dev] !== undefined) {
        devices[dev]++;
      } else {
        devices.Desktop++; // Safeguard fallback
      }

      // 3. Browsers
      const browser = click.browser;
      browsers[browser] = (browsers[browser] || 0) + 1;

      // 4. Countries
      const country = click.country;
      countries[country] = (countries[country] || 0) + 1;

      // 5. Cities
      const city = click.city;
      cities[city] = (cities[city] || 0) + 1;

      // 6. Referrers
      const ref = click.referrer;
      referrers[ref] = (referrers[ref] || 0) + 1;
    });

    // Format clicksOverTime into sorted chart friendly arrays
    const formattedTimeline = Object.keys(clicksOverTime).map(date => ({
      date,
      clicks: clicksOverTime[date]
    }));

    return res.json({
      code: link.code,
      longUrl: link.longUrl,
      totalClicks,
      analytics: {
        clicksOverTime: formattedTimeline,
        devices,
        browsers: Object.entries(browsers).map(([name, value]) => ({ name, value })),
        countries: Object.entries(countries).map(([name, value]) => ({ name, value })),
        cities: Object.entries(cities).map(([name, value]) => ({ name, value })),
        referrers: Object.entries(referrers).map(([name, value]) => ({ name, value }))
      }
    });
  } catch (err) {
    console.error('GetStats error:', err);
    return res.status(500).json({ error: 'Internal server error compiling analytics.' });
  }
}
