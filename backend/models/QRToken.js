const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * QRToken Model
 *
 * Provides rotating QR code tokens for replay protection.
 * Each token is short-lived (30-60 seconds) and tied to a specific session.
 *
 * Security benefits:
 * - Prevents screenshot sharing (token expires before it can be forwarded)
 * - Prevents session ID guessing (requires valid token)
 * - Creates audit trail (which token was used to mark attendance)
 *
 * The QR code encodes: { sessionId, token }
 * Students must scan within the token's validity window.
 */
const QRTokenSchema = new mongoose.Schema({
  session_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SessionNew',
    required: [true, 'Session ID is required']
  },
  token: {
    type: String,
    required: [true, 'Token is required'],
    default: () => crypto.randomBytes(3).toString('hex') // 6-char token
  },
  expires_at: {
    type: Date,
    required: [true, 'Expiration time is required'],
    default: () => new Date(Date.now() + 60000) // 60 seconds from now
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: false
  }
});

// Indexes
// TTL index: MongoDB automatically deletes expired tokens
QRTokenSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

// Unique constraint: No duplicate tokens per session
QRTokenSchema.index({ session_id: 1, token: 1 }, { unique: true });

// Lookup by session (to get current valid token)
QRTokenSchema.index({ session_id: 1, expires_at: -1 });

/**
 * Check if this token is still valid
 */
QRTokenSchema.methods.isValid = function() {
  return new Date() < this.expires_at;
};

/**
 * Static: Generate a new QR token for a session
 * @param {ObjectId} sessionId - The session to generate a token for
 * @param {number} validityMs - Token validity in milliseconds (default 60000 = 60s)
 * @returns {Promise<QRToken>} The created token document
 */
QRTokenSchema.statics.generateForSession = async function(sessionId, validityMs = 60000) {
  const token = crypto.randomBytes(3).toString('hex');
  const expires_at = new Date(Date.now() + validityMs);

  return await this.create({
    session_id: sessionId,
    token,
    expires_at
  });
};

/**
 * Static: Validate a token for attendance marking
 * @param {ObjectId} sessionId - The session ID
 * @param {string} token - The token from QR code
 * @returns {Promise<QRToken|null>} The token if valid, null otherwise
 */
QRTokenSchema.statics.validateToken = async function(sessionId, token) {
  return await this.findOne({
    session_id: sessionId,
    token: token,
    expires_at: { $gt: new Date() }
  });
};

module.exports = mongoose.model('QRToken', QRTokenSchema);
