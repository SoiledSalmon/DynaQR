/**
 * Migration: 006 - Migrate Attendance
 *
 * Migrates old Attendance records to new AttendanceNew collection.
 * Uses session-id-map.json from migration 005 to map old session IDs to new ones.
 *
 * Strategy:
 * 1. Load session ID map from previous migration
 * 2. For each old Attendance record
 * 3. Find the new session ID and student ID
 * 4. Create AttendanceNew record with verification metadata
 */

// --- DNS FIX ---
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
// ---------------

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Models
const Attendance = require('../models/Attendance');
const AttendanceNew = require('../models/AttendanceNew');
const Student = require('../models/Student');
const User = require('../models/User');

const connectDB = require('../config/db');

async function migrate() {
  console.log('🚀 Starting Migration 006: Migrate Attendance...\n');

  try {
    await connectDB();

    // Step 1: Load session ID map
    const mapPath = path.join(__dirname, 'session-id-map.json');

    if (!fs.existsSync(mapPath)) {
      console.error('❌ session-id-map.json not found. Run migration 005 first.');
      process.exit(1);
    }

    const sessionIdMap = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));
    console.log(`📊 Loaded session ID map with ${Object.keys(sessionIdMap).length} entries\n`);

    // Step 2: Get all old attendance records
    const oldAttendance = await Attendance.find({}).lean();

    if (oldAttendance.length === 0) {
      console.log('⚠️  No attendance records found. Nothing to migrate.');
      process.exit(0);
    }

    console.log(`📊 Found ${oldAttendance.length} attendance records to migrate\n`);

    // Step 3: Build user → student ID map
    const users = await User.find({ role: 'student' }).lean();
    const students = await Student.find({}).lean();

    const userIdToEmail = new Map();
    for (const user of users) {
      userIdToEmail.set(user._id.toString(), user.email.toLowerCase());
    }

    const emailToStudentId = new Map();
    for (const s of students) {
      emailToStudentId.set(s.email.toLowerCase(), s._id);
    }

    // Step 4: Migrate each record
    let migrated = 0;
    let skipped = 0;
    const errors = [];

    for (const oldRecord of oldAttendance) {
      try {
        // Get new session ID
        const newSessionId = sessionIdMap[oldRecord.session_id.toString()];
        if (!newSessionId) {
          console.log(`   ⚠️  No mapping for session ID: ${oldRecord.session_id}`);
          skipped++;
          continue;
        }

        // Get new student ID
        const email = userIdToEmail.get(oldRecord.student_id.toString());
        if (!email) {
          console.log(`   ⚠️  No email for student ID: ${oldRecord.student_id}`);
          skipped++;
          continue;
        }

        const newStudentId = emailToStudentId.get(email);
        if (!newStudentId) {
          console.log(`   ⚠️  No Student record for: ${email}`);
          skipped++;
          continue;
        }

        // Check if already migrated
        const existing = await AttendanceNew.findOne({
          session_id: new mongoose.Types.ObjectId(newSessionId),
          student_id: newStudentId
        });

        if (existing) {
          console.log(`   ⏭️  Already exists: ${oldRecord.usn || 'unknown'}`);
          continue;
        }

        // Create new attendance record
        await AttendanceNew.create({
          session_id: new mongoose.Types.ObjectId(newSessionId),
          student_id: newStudentId,
          student_name: oldRecord.student_name || 'Unknown',
          student_usn: oldRecord.usn || 'Unknown',
          qr_token_used: null, // Legacy records don't have token
          marked_at: oldRecord.timestamp || new Date(),
          ip_address: null,
          user_agent: null
        });

        migrated++;

        if (migrated % 100 === 0) {
          console.log(`   ... migrated ${migrated} records`);
        }

      } catch (err) {
        if (err.code === 11000) {
          // Duplicate - already exists
          skipped++;
        } else {
          errors.push({ record: oldRecord._id, error: err.message });
        }
      }
    }

    // Summary
    console.log(`\n📈 Migration Results:`);
    console.log(`   - Migrated: ${migrated}`);
    console.log(`   - Skipped: ${skipped}`);
    console.log(`   - Errors: ${errors.length}`);
    console.log(`   - Total in new collection: ${await AttendanceNew.countDocuments()}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors:');
      errors.slice(0, 10).forEach(e => console.log(`   - ${e.record}: ${e.error}`));
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more`);
      }
    }

    console.log('\n✅ Migration 006 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run migration
migrate();
