const mongoose = require('mongoose');

const classSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., "Computer Networks"
  section: { type: String, required: true }, // e.g., "A"
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: String }] // List of USNs enrolled
});

module.exports = mongoose.model('Class', classSchema);