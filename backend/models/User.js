const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'faculty'], required: true },

  // Student Specifics
  student_details: {
    name: { type: String, required: function() { return this.role === 'student'; } },
    usn: { type: String, required: function() { return this.role === 'student'; } },
    section: { type: String, required: function() { return this.role === 'student'; } }
  },

  // Faculty Specifics
  faculty_details: {
    name: { type: String, required: function() { return this.role === 'faculty'; } },
    emp_id: { type: String, required: function() { return this.role === 'faculty'; } },
    department: { type: String, required: function() { return this.role === 'faculty'; } }
  }
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);