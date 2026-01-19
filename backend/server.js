const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Fix for MongoDB connection issues

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); // Import Rate Limit
const connectDB = require('./config/db');

// Initialize App
const app = express();

// --- SECURITY MIDDLEWARE ---

// 1. CORS Whitelist
const whitelist = ['http://localhost:3000', 'http://localhost:5000'];
const corsOptions = {
  origin: function (origin, callback) {
    if (whitelist.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
};
app.use(cors(corsOptions)); // Apply CORS with options

// 2. Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
app.use('/api', limiter); // Apply to all API routes

// Middleware
app.use(express.json()); // Allows server to read JSON data

// Connect to Database
connectDB();

// --- ROUTES ---
// 1. Authentication Routes (Register, Login)
app.use('/api/auth', require('./routes/authRoutes'));

// 2. Attendance Routes (Create Session, Mark Attendance)
app.use('/api/attendance', require('./routes/attendanceRoutes'));

// Basic Test Route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));