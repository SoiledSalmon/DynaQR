const mongoose = require('mongoose');

const MasterStudentSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true },
  usn: { type: String, required: true, unique: true }, // e.g., "1RV22CS001"
  section: { type: String, required: true }            // e.g., "CS-A"
});

module.exports = mongoose.model('MasterStudent', MasterStudentSchema);