import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/config/Swagger.js";
// Import main router
import apiRoutes from './src/routes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use('/public', express.static('public'));
app.use('/uploads', express.static('public/uploads'));

// API Routes
app.use('/api/v1', apiRoutes);

// Example route (root)
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>HackRact Message</title>
      <style>
        html, body {
          margin: 0;
          padding: 0;
          height: 100%;
          width: 100%;
          background: #1e1e1e;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
          color: #ffdd57;
          font-family: "Courier New", Courier, monospace;
        }
        .message {
          font-size: 2rem;
          text-align: center;
          animation: float 3s ease-in-out infinite, colorchange 2s linear infinite;
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        @keyframes colorchange {
          0% { color: #ffdd57; }
          25% { color: #ff5e57; }
          50% { color: #57ffae; }
          75% { color: #57a6ff; }
          100% { color: #ffdd57; }
        }
        .overlay {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          align-items: center;
        }
        .overlay span {
          margin: 5px;
          font-size: 1.2rem;
          animation: spin 4s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="message">
        Hi Gentleman All HackRact Developers!<br>
        All of You Are Geniuses On the Planet! 🚀
      </div>

      <div class="overlay">
        ${Array(500).fill('<span>🚀 HackRact!</span>').join('')}
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Swagger Docs
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customSiteTitle: "HackRact API Docs"
  })
);

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method,
    availableRoutes: {
      root: 'GET /',
      health: 'GET /health',
      apiDocs: 'GET /api-docs',
      apiV1: '/api/v1'
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

export default app;