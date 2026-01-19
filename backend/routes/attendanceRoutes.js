const express = require('express');
const router = express.Router();
const { protect, authorizeRole } = require('../middleware/authMiddleware');
const { 
  createSession, 
  markAttendance, 
  getStudentHistory, 
  getSessionDetails 
} = require('../controllers/attendanceController');

// --- WRITE ROUTES (Actions) ---
router.post('/create', protect, authorizeRole(['teacher']), createSession);
router.post('/mark', protect, authorizeRole(['student']), markAttendance);

// --- READ ROUTES (Dashboards) ---
// If these lines are missing, the test fails!
router.get('/history', protect, authorizeRole(['student']), getStudentHistory);
router.get('/session/:sessionId', protect, authorizeRole(['teacher']), getSessionDetails);

module.exports = router;