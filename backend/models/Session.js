const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  faculty_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true }, // e.g., "Maths"
  section: { type: String, required: true }, // e.g., "A"
  
  // Faculty sets these manually
  class_start_time: { type: Date, required: true }, 
  class_end_time: { type: Date, required: true },
  
  secret_key: { type: String, required: true }, // The unique QR code string
  is_active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);