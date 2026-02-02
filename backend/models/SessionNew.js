const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * Session Model (Refactored)
 *
 * Represents an attendance session created by a faculty member.
 * Now references Teaching instead of storing faculty_id + subject + section directly.
 *
 * Status lifecycle: scheduled → active → completed (or cancelled)
 */

const SESSION_STATUSES = ['scheduled', 'active', 'completed', 'cancelled'];

const SessionSchemaNew = new mongoose.Schema({
  teaching_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Teaching',
    required: [true, 'Teaching assignment ID is required']
  },
  start_time: {
    type: Date,
    required: [true, 'Start time is required']
  },
  end_time: {
    type: Date,
    required: [true, 'End time is required'],
    validate: {
      validator: function(value) {
        return value > this.start_time;
      },
      message: 'End time must be after start time'
    }
  },
  secret_key: {
    type: String,
    required: true,
    default: () => crypto.randomBytes(16).toString('hex')
  },
  status: {
    type: String,
    enum: {
      values: SESSION_STATUSES,
      message: 'Status must be one of: ' + SESSION_STATUSES.join(', ')
    },
    default: 'scheduled'
  }
}, {
  timestamps: {
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  }
});

// Indexes
SessionSchemaNew.index({ teaching_id: 1, start_time: -1 }); // Faculty's sessions, newest first
SessionSchemaNew.index({ status: 1, start_time: 1 }); // Find active/scheduled sessions
SessionSchemaNew.index({ secret_key: 1 }); // QR lookup (should be unique in practice)
SessionSchemaNew.index({ start_time: 1 }); // Date range queries

/**
 * Check if session is currently active based on time and status
 */
SessionSchemaNew.methods.isCurrentlyActive = function() {
  const now = new Date();
  return (
    this.status === 'active' &&
    now >= this.start_time &&
    now <= this.end_time
  );
};

/**
 * Check if session is within its valid time window (regardless of status)
 */
SessionSchemaNew.methods.isWithinTimeWindow = function() {
  const now = new Date();
  return now >= this.start_time && now <= this.end_time;
};

/**
 * Auto-update status based on current time
 * Call this before critical operations
 */
SessionSchemaNew.methods.updateStatusByTime = function() {
  const now = new Date();

  if (this.status === 'cancelled') {
    return; // Don't change cancelled sessions
  }

  if (now < this.start_time) {
    this.status = 'scheduled';
  } else if (now >= this.start_time && now <= this.end_time) {
    this.status = 'active';
  } else if (now > this.end_time) {
    this.status = 'completed';
  }
};

// Static constants for export
SessionSchemaNew.statics.STATUSES = SESSION_STATUSES;

module.exports = mongoose.model('SessionNew', SessionSchemaNew);
