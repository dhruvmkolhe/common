import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Connect DB & Redis immediately
import './config/db.js';
import './config/redis.js';

// Routers
import authRouter from './routes/auth.js';
import linksRouter from './routes/links.js';
import { handleRedirect, authenticatePassword } from './controllers/redirectController.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Resolve dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure CORS
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:5173', // Vite default port
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true
}));

// Body Parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log requests in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/links', linksRouter);

// Password wall post action
app.post('/redirect-auth/:code', authenticatePassword);

// Redirection handler (Matches GET /:code)
app.get('/:code', handleRedirect);

// Serve compiled static files in Production
const frontendBuildPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendBuildPath)) {
  console.log(`Serving compiled frontend assets from: ${frontendBuildPath}`);
  app.use(express.static(frontendBuildPath));
  
  // Catch-all route to serve Index.html for Single Page App routing
  app.get('*', (req, res, next) => {
    // Avoid capturing redirect short codes here
    if (req.url.startsWith('/api/') || req.url.length <= 1) {
      return next();
    }
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  });
} else {
  console.log('Static frontend assets folder not found. API server running in standalone mode.');
  app.get('/', (req, res) => {
    res.json({
      message: 'Common URL Shortener API is online.',
      status: 'healthy',
      time: new Date()
    });
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Something went wrong on our end. Please try again later.' });
});

// Start Server
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`🚀 API Server running on port ${PORT}`);
  console.log(`🌐 Redirection Base: ${process.env.BASE_URL || 'http://localhost:5000'}`);
  console.log(`🔧 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`========================================`);
});
