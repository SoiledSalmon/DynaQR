const mongoose = require('mongoose');

const MasterFacultySchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  name: { type: String, required: true },
  emp_id: { type: String, required: true, unique: true }, // e.g., "FAC102"
  department: { type: String, required: true }            // e.g., "CSE"
});

module.exports = mongoose.model('MasterFaculty', MasterFacultySchema);