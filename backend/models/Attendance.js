const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Snapshot of details (in case student changes name later)
  student_name: { type: String },
  usn: { type: String },
  
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Attendance', attendanceSchema);