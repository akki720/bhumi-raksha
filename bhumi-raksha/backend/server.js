require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const socketService = require('./services/socketService');
const { startScheduledRefresh } = require('./services/riskZoneRefresher');

const authRoutes = require('./routes/authRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const riskRoutes = require('./routes/riskRoutes');
const reportRoutes = require('./routes/reportRoutes');
const alertRoutes = require('./routes/alertRoutes');
const safePlaceRoutes = require('./routes/safePlaceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const sosRoutes = require('./routes/sosRoutes');
const offlineRoutes = require('./routes/offlineRoutes');

const app = express();
const server = http.createServer(app);

const parseAllowedOrigins = () => {
  const configuredOrigins = (process.env.CLIENT_ORIGIN || process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set([...configuredOrigins, 'http://localhost:5173', 'http://localhost:3000'])];
};

const allowedOrigins = parseAllowedOrigins();
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST', 'PATCH'] },
});
socketService.initSocket(io);

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const apiLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => {
  res.json({ available: true, status: 'ok', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/risk', riskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/safe-places', safePlaceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/offline', offlineRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`[BHUMI RAKSHA backend] running on port ${PORT}`);
      startScheduledRefresh();
    });
  })
  .catch((err) => {
    console.error('[BHUMI RAKSHA backend] failed to start:', err.message);
    process.exit(1);
  });

module.exports = { app, server };
