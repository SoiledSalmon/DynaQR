const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Fix for MongoDB connection issues

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize App
const app = express();

// Middleware
app.use(express.json()); // Allows server to read JSON data
app.use(cors()); // Allows Frontend to talk to Backend

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