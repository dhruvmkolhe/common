import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const redisClient = createClient({
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      // Reconnect strategy: try every 2 seconds, max out at 5 retries
      if (retries >= 5) {
        console.warn('Redis reconnection failed after 5 attempts. Falling back to DB-only operation.');
        return new Error('Redis connection failed');
      }
      return 2000;
    }
  }
});

let isConnected = false;

redisClient.on('connect', () => {
  console.log('Redis client attempting to connect...');
});

redisClient.on('ready', () => {
  console.log('Redis client ready and connected.');
  isConnected = true;
});

redisClient.on('error', (err) => {
  console.error('Redis error occurred:', err.message);
  isConnected = false;
});

redisClient.on('end', () => {
  console.log('Redis connection closed.');
  isConnected = false;
});

// Connect immediately
try {
  await redisClient.connect();
} catch (err) {
  console.error('Failed to initialize Redis client. Operating in DB-only mode.', err.message);
}

export { redisClient, isConnected };
export default redisClient;
