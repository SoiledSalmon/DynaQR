const express = require('express');
const router = express.Router();
const { protect, authorizeRole } = require('../middleware/authMiddleware');
const {
  createSession,
  markAttendance,
  getStudentHistory,
  getSessionDetails,
  getStudentMetrics,
  getTeacherDashboardData
} = require('../controllers/attendanceController');

// --- WRITE ROUTES (Actions) ---
router.post('/create', protect, authorizeRole(['teacher']), createSession);
router.post('/mark', protect, authorizeRole(['student']), markAttendance);

// --- READ ROUTES (Dashboards) ---
router.get('/student-metrics', protect, authorizeRole(['student']), getStudentMetrics);
router.get('/history', protect, authorizeRole(['student']), getStudentHistory);
router.get('/teacher-dashboard', protect, authorizeRole(['teacher']), getTeacherDashboardData);

module.exports = router;