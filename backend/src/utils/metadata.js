import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Fetches site metadata (title, description, icon) from a target long URL.
 * Fails gracefully returning generic placeholders if the target is offline or slow.
 * 
 * @param {string} url - The target URL to fetch metadata from.
 * @returns {Promise<{title: string, description: string, iconUrl: string}>}
 */
export async function getUrlMetadata(url) {
  const fallback = {
    title: new URL(url).hostname,
    description: 'No description available for this link.',
    iconUrl: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`
  };

  try {
    const response = await axios.get(url, {
      timeout: 2500, // Quick timeout to keep redirection fast
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (response.status !== 200) {
      return fallback;
    }

    const $ = cheerio.load(response.data);
    
    // Extract Title
    const title = $('title').text() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || 
                  fallback.title;

    // Extract Description
    const description = $('meta[name="description"]').attr('content') || 
                        $('meta[property="og:description"]').attr('content') || 
                        $('meta[name="twitter:description"]').attr('content') || 
                        fallback.description;

    // Extract Favicon
    let favicon = $('link[rel="apple-touch-icon"]').attr('href') ||
                  $('link[rel="shortcut icon"]').attr('href') ||
                  $('link[rel="icon"]').attr('href');

    let iconUrl = fallback.iconUrl;
    if (favicon) {
      if (favicon.startsWith('http')) {
        iconUrl = favicon;
      } else {
        const urlObj = new URL(url);
        iconUrl = `${urlObj.protocol}//${urlObj.host}${favicon.startsWith('/') ? '' : '/'}${favicon}`;
      }
    }

    return {
      title: title.trim().substring(0, 100),
      description: description.trim().substring(0, 200),
      iconUrl
    };
  } catch (err) {
    console.warn(`Could not fetch metadata for ${url}:`, err.message);
    return fallback;
  }
}
