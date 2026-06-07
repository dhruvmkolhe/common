import geoip from 'geoip-lite';
import UAParser from 'ua-parser-js';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js';
import { redisClient, isConnected as isRedisConnected } from '../config/redis.js';

// Realistic geo list for local development mocking
const MOCK_LOCATIONS = [
  { country: 'United States', city: 'San Francisco' },
  { country: 'United Kingdom', city: 'London' },
  { country: 'Germany', city: 'Berlin' },
  { country: 'Japan', city: 'Tokyo' },
  { country: 'Canada', city: 'Toronto' },
  { country: 'Australia', city: 'Sydney' },
  { country: 'India', city: 'Mumbai' },
  { country: 'France', city: 'Paris' }
];

/**
 * Normalizes Referrer to human readable names.
 */
function parseReferrer(refHeader) {
  if (!refHeader) return 'Direct';
  try {
    const url = new URL(refHeader);
    const host = url.hostname.toLowerCase();
    
    if (host.includes('t.co') || host.includes('twitter.com') || host.includes('x.com')) return 'Twitter / X';
    if (host.includes('linkedin.com')) return 'LinkedIn';
    if (host.includes('facebook.com') || host.includes('fb.me')) return 'Facebook';
    if (host.includes('instagram.com')) return 'Instagram';
    if (host.includes('google.com')) return 'Google Search';
    if (host.includes('github.com')) return 'GitHub';
    if (host.includes('youtube.com')) return 'YouTube';
    if (host.includes('reddit.com')) return 'Reddit';
    
    return url.hostname;
  } catch (_) {
    return 'Referral';
  }
}

/**
 * Asynchronously logs click analytics in the background.
 * Keeps redirection responses snappy.
 */
async function captureAnalytic(linkId, req) {
  try {
    const userAgent = req.headers['user-agent'] || '';
    const referrerHeader = req.headers['referer'] || req.headers['referrer'] || '';
    
    // Parse IP
    let ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    if (ip.includes(',')) {
      ip = ip.split(',')[0].trim();
    }
    // Clean IPv6 prefix
    if (ip.startsWith('::ffff:')) {
      ip = ip.substring(7);
    }

    // Parse Device & Browser using UAParser
    const ua = new UAParser(userAgent).getResult();
    const browserName = ua.browser.name || 'Unknown';
    const osName = ua.os.name || 'Unknown';
    
    // Map device category
    let deviceType = 'Desktop';
    if (ua.device.type === 'mobile') {
      deviceType = 'Mobile';
    } else if (ua.device.type === 'tablet') {
      deviceType = 'Tablet';
    }

    // Parse Geolocation
    let country = 'Unknown';
    let city = 'Unknown';
    
    const geo = geoip.lookup(ip);
    if (geo) {
      country = geo.country || 'Unknown';
      city = geo.city || 'Unknown';
      
      // Convert country code to full name if needed
      // (Using simple mapping, fallback to code)
      if (country === 'US') country = 'United States';
      else if (country === 'GB') country = 'United Kingdom';
      else if (country === 'DE') country = 'Germany';
      else if (country === 'JP') country = 'Japan';
      else if (country === 'CA') country = 'Canada';
      else if (country === 'IN') country = 'India';
      else if (country === 'FR') country = 'France';
    } else if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      // Development Mocking to make local dashboard stats gorgeous!
      const mock = MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
      country = mock.country;
      city = mock.city;
    }

    const referrer = parseReferrer(referrerHeader);

    // Save to Database
    await prisma.analytic.create({
      data: {
        linkId,
        ip,
        country,
        city,
        browser: browserName,
        os: osName,
        device: deviceType,
        referrer
      }
    });
  } catch (err) {
    console.error('Error logging click analytic:', err.message);
  }
}

/**
 * HTML Template for Password Wall Gate
 */
function getPasswordWallHtml(code, error = '') {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Protected Link - URL Shortener</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Outfit', sans-serif;
          background: radial-gradient(circle at 50% 50%, #111827 0%, #030712 100%);
          color: #f3f4f6;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          overflow: hidden;
        }
        .container {
          background: rgba(17, 24, 39, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 3rem 2.5rem;
          max-width: 450px;
          width: 100%;
          text-align: center;
          backdrop-filter: blur(20px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
                      0 0 40px rgba(99, 102, 241, 0.1);
          position: relative;
        }
        .container::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(135deg, #6366f1, #a855f7, #06b6d4);
          border-radius: 26px;
          z-index: -1;
          opacity: 0.15;
        }
        .icon {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.15), rgba(168, 85, 247, 0.15));
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          color: #a855f7;
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
        }
        .icon svg {
          width: 32px;
          height: 32px;
        }
        h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          letter-spacing: -0.5px;
          background: linear-gradient(to right, #ffffff, #9ca3af);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        p {
          color: #9ca3af;
          font-size: 0.95rem;
          line-height: 1.5;
          margin-bottom: 2rem;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .input-group {
          position: relative;
        }
        input[type="password"] {
          width: 100%;
          padding: 1rem 1.25rem;
          background: rgba(3, 7, 18, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #ffffff;
          font-size: 1rem;
          outline: none;
          font-family: inherit;
          transition: all 0.3s ease;
        }
        input[type="password"]:focus {
          border-color: #6366f1;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
          background: rgba(3, 7, 18, 0.8);
        }
        button {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          border: none;
          border-radius: 12px;
          color: #ffffff;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 20px rgba(99, 102, 241, 0.3);
        }
        button:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(168, 85, 247, 0.4);
          background: linear-gradient(135deg, #5046e4, #9333ea);
        }
        button:active {
          transform: translateY(0);
        }
        .error-message {
          color: #ef4444;
          font-size: 0.85rem;
          margin-top: -0.5rem;
          text-align: left;
          padding-left: 0.25rem;
        }
        .footer {
          margin-top: 2.5rem;
          font-size: 0.8rem;
          color: #4b5563;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        <h1>Enter Password</h1>
        <p>This link is encrypted and requires a password to grant access.</p>
        <form method="POST" action="/redirect-auth/${code}">
          <div class="input-group">
            <input type="password" name="password" placeholder="Password" required autofocus>
          </div>
          ${error ? `<div class="error-message">${error}</div>` : ''}
          <button type="submit">Unlock & Access</button>
        </form>
        <div class="footer">Securely redirected by Common URL Shortener</div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Standard HTTP Redirection Handler (GET /:code)
 */
export async function handleRedirect(req, res) {
  const { code } = req.params;

  try {
    let linkData = null;

    // 1. Try fetching from Redis Cache first
    if (isRedisConnected) {
      try {
        const cached = await redisClient.get(`link:${code}`);
        if (cached) {
          linkData = JSON.parse(cached);
          console.debug(`Redis Cache Hit for code: ${code}`);
        }
      } catch (cacheErr) {
        console.warn('Redis read failed. Bypassing to DB:', cacheErr.message);
      }
    }

    // 2. Cache Miss: Fetch from PostgreSQL Database
    if (!linkData) {
      const link = await prisma.link.findUnique({
        where: { code }
      });

      if (!link) {
        // Return structured modern 404 HTML page
        return res.status(404).send(getCustomErrorHtml('404: Link Not Found', 'This short code does not exist. Please check your spelling or verify if the owner deleted it.'));
      }

      linkData = {
        id: link.id,
        code: link.code,
        longUrl: link.longUrl,
        passwordHash: link.passwordHash,
        expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
        isEnabled: link.isEnabled
      };

      // Store in Redis (TTL: 24 Hours)
      if (isRedisConnected) {
        try {
          await redisClient.setEx(`link:${code}`, 86400, JSON.stringify(linkData));
          console.debug(`Redis Cache Warmed for code: ${code}`);
        } catch (cacheErr) {
          console.warn('Redis write failed:', cacheErr.message);
        }
      }
    }

    // 3. Check Toggle State
    if (!linkData.isEnabled) {
      return res.status(403).send(getCustomErrorHtml('Link Disabled', 'This short link has been temporarily disabled by its creator.'));
    }

    // 4. Check Expiration
    if (linkData.expiresAt && new Date(linkData.expiresAt) <= new Date()) {
      return res.status(410).send(getCustomErrorHtml('Link Expired', 'This short link has expired and is no longer available.'));
    }

    // 5. Check Password protection wall
    if (linkData.passwordHash) {
      // Serve the beautiful password entry screen
      return res.send(getPasswordWallHtml(code));
    }

    // 6. Non-blocking: Capture click analytics in background
    captureAnalytic(linkData.id, req);

    // 7. Perform Redirect!
    return res.redirect(302, linkData.longUrl);
  } catch (err) {
    console.error('Redirection error:', err);
    return res.status(500).send(getCustomErrorHtml('500: Server Error', 'An unexpected error occurred. Please try again.'));
  }
}

/**
 * Handle POST submission for password authentication (POST /redirect-auth/:code)
 */
export async function authenticatePassword(req, res) {
  const { code } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).send(getPasswordWallHtml(code, 'Password is required.'));
  }

  try {
    // Fetch link details
    let link = null;
    
    // Check Redis
    if (isRedisConnected) {
      const cached = await redisClient.get(`link:${code}`);
      if (cached) link = JSON.parse(cached);
    }
    
    if (!link) {
      link = await prisma.link.findUnique({ where: { code } });
      if (!link) return res.status(404).send(getCustomErrorHtml('Link Not Found', 'This short code does not exist.'));
    }

    // Validate if password gate is still active
    if (!link.passwordHash) {
      return res.redirect(302, link.longUrl);
    }

    // Compare Hash
    const isMatch = await bcrypt.compare(password, link.passwordHash);
    if (!isMatch) {
      return res.status(401).send(getPasswordWallHtml(code, 'Incorrect password. Access denied.'));
    }

    // Pass -> Asynchronously capture click analytics
    captureAnalytic(link.id, req);

    // Redirect to destination
    return res.redirect(302, link.longUrl);
  } catch (err) {
    console.error('Password redirect auth error:', err);
    return res.status(500).send(getPasswordWallHtml(code, 'Internal server error validating password.'));
  }
}

/**
 * HTML Helper for serving gorgeous Custom Error Pages (404, Expired, Disabled)
 */
function getCustomErrorHtml(title, message) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} - Common Link</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
      <style>
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Outfit', sans-serif;
          background: radial-gradient(circle at 50% 50%, #111827 0%, #030712 100%);
          color: #f3f4f6;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          overflow: hidden;
        }
        .container {
          background: rgba(17, 24, 39, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 24px;
          padding: 3.5rem 2.5rem;
          max-width: 480px;
          width: 100%;
          text-align: center;
          backdrop-filter: blur(20px);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
                      0 0 40px rgba(239, 68, 68, 0.05);
          position: relative;
        }
        .container::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(135deg, #ef4444, #f59e0b);
          border-radius: 26px;
          z-index: -1;
          opacity: 0.15;
        }
        .icon {
          width: 70px;
          height: 70px;
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(245, 158, 11, 0.15));
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
          color: #ef4444;
          box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
        }
        .icon svg {
          width: 32px;
          height: 32px;
        }
        h1 {
          font-size: 1.85rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
          letter-spacing: -0.5px;
          background: linear-gradient(to right, #ffffff, #d1d5db);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        p {
          color: #9ca3af;
          font-size: 0.95rem;
          line-height: 1.6;
          margin-bottom: 2.25rem;
        }
        .btn {
          display: inline-block;
          padding: 0.9rem 2rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #ffffff;
          font-size: 0.95rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s ease;
        }
        .btn:hover {
          background: #ffffff;
          color: #030712;
          box-shadow: 0 0 20px rgba(255, 255, 255, 0.2);
          transform: translateY(-2.5px);
        }
        .footer {
          margin-top: 2.5rem;
          font-size: 0.8rem;
          color: #4b5563;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
        </div>
        <h1>${title}</h1>
        <p>${message}</p>
        <a href="/" class="btn">Return to Platform</a>
        <div class="footer">Common Link Security</div>
      </div>
    </body>
    </html>
  `;
}
