const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { 
  createSession, 
  markAttendance, 
  getStudentHistory, 
  getSessionDetails 
} = require('../controllers/attendanceController');

// --- WRITE ROUTES (Actions) ---
router.post('/create', protect, createSession);
router.post('/mark', protect, markAttendance);

// --- READ ROUTES (Dashboards) ---
// If these lines are missing, the test fails!
router.get('/history', protect, getStudentHistory);
router.get('/session/:sessionId', protect, getSessionDetails);

module.exports = router;