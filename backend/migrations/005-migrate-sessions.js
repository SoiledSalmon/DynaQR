/**
 * Migration: 005 - Migrate Sessions
 *
 * Migrates old Session records to new SessionNew collection with teaching_id reference.
 *
 * Strategy:
 * 1. For each old Session
 * 2. Find the Teaching record that matches (faculty_id, subject, section)
 * 3. Create a SessionNew record with teaching_id
 *
 * Status mapping:
 * - is_active=true + within time → 'active'
 * - is_active=true + future → 'scheduled'
 * - is_active=true + past → 'completed'
 * - is_active=false → 'cancelled'
 *
 * Note: Sessions without matching Teaching records will be skipped.
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
const Session = require('../models/Session');
const SessionNew = require('../models/SessionNew');
const Subject = require('../models/Subject');
const Faculty = require('../models/Faculty');
const Teaching = require('../models/Teaching');
const User = require('../models/User');

const connectDB = require('../config/db');

function determineStatus(session) {
  if (!session.is_active) {
    return 'cancelled';
  }

  const now = new Date();
  const start = new Date(session.class_start_time);
  const end = new Date(session.class_end_time);

  if (now < start) {
    return 'scheduled';
  } else if (now >= start && now <= end) {
    return 'active';
  } else {
    return 'completed';
  }
}

async function migrate() {
  console.log('🚀 Starting Migration 005: Migrate Sessions...\n');

  try {
    await connectDB();

    // Step 1: Get all old sessions
    const oldSessions = await Session.find({}).lean();

    if (oldSessions.length === 0) {
      console.log('⚠️  No sessions found. Nothing to migrate.');
      // Create empty map file
      const mapPath = path.join(__dirname, 'session-id-map.json');
      fs.writeFileSync(mapPath, JSON.stringify({}, null, 2));
      process.exit(0);
    }

    console.log(`📊 Found ${oldSessions.length} sessions to migrate\n`);

    // Step 2: Build lookup maps
    // Map old User._id to email
    const users = await User.find({ role: 'faculty' }).lean();
    const faculty = await Faculty.find({}).lean();

    const userIdToEmail = new Map();
    for (const user of users) {
      if (user._id && user.email) {
        userIdToEmail.set(user._id.toString(), user.email.toLowerCase());
      }
    }

    const emailToFacultyId = new Map();
    for (const f of faculty) {
      if (f.email) {
        emailToFacultyId.set(f.email.toLowerCase(), f._id);
      }
    }

    // Map subject name to Subject._id
    const subjects = await Subject.find({}).lean();
    const subjectNameToId = new Map();
    for (const s of subjects) {
      if (s.name) {
        subjectNameToId.set(s.name.toLowerCase(), s._id);
      }
    }

    console.log(`📊 User (faculty) records: ${users.length}`);
    console.log(`📊 Faculty records: ${faculty.length}`);
    console.log(`📊 Subject records: ${subjects.length}\n`);

    // Step 3: Session ID map for attendance migration
    const sessionIdMap = {};

    // Step 4: Migrate each session
    let migrated = 0;
    let skipped = 0;
    let alreadyMigrated = 0;

    for (const oldSession of oldSessions) {
      // Validate required fields
      if (!oldSession.secret_key) {
        console.log(`   ⚠️  Session missing secret_key, skipping`);
        skipped++;
        continue;
      }

      // Check if already migrated (by secret_key as unique identifier)
      const existing = await SessionNew.findOne({ secret_key: oldSession.secret_key });
      if (existing) {
        sessionIdMap[oldSession._id.toString()] = existing._id.toString();
        alreadyMigrated++;
        continue;
      }

      // Skip sessions with missing required data
      if (!oldSession.faculty_id || !oldSession.subject || !oldSession.section) {
        console.log(`   ⚠️  Session missing required fields, skipping`);
        skipped++;
        continue;
      }

      // Find Faculty email from old User ID
      const email = userIdToEmail.get(oldSession.faculty_id.toString());
      if (!email) {
        console.log(`   ⚠️  No email for faculty ID: ${oldSession.faculty_id} (session: ${oldSession.subject})`);
        skipped++;
        continue;
      }

      // Find new Faculty ID
      const facultyId = emailToFacultyId.get(email);
      if (!facultyId) {
        console.log(`   ⚠️  No Faculty record for: ${email}`);
        skipped++;
        continue;
      }

      // Find Subject ID
      const subjectId = subjectNameToId.get(oldSession.subject.toLowerCase().trim());
      if (!subjectId) {
        console.log(`   ⚠️  No Subject record for: "${oldSession.subject}"`);
        skipped++;
        continue;
      }

      // Find Teaching record
      const teaching = await Teaching.findOne({
        faculty_id: facultyId,
        subject_id: subjectId,
        section: oldSession.section
      });

      if (!teaching) {
        console.log(`   ⚠️  No Teaching record for: ${email} → ${oldSession.subject} (${oldSession.section})`);
        skipped++;
        continue;
      }

      // Determine status
      const status = determineStatus(oldSession);

      // Create new session
      const newSession = await SessionNew.create({
        teaching_id: teaching._id,
        start_time: oldSession.class_start_time,
        end_time: oldSession.class_end_time,
        secret_key: oldSession.secret_key,
        status: status
      });

      sessionIdMap[oldSession._id.toString()] = newSession._id.toString();
      migrated++;

      console.log(`   ✅ Migrated: ${oldSession.subject} (${oldSession.section}) → ${status}`);
    }

    // Step 5: Save session ID map for attendance migration
    const mapPath = path.join(__dirname, 'session-id-map.json');
    fs.writeFileSync(mapPath, JSON.stringify(sessionIdMap, null, 2));
    console.log(`\n📁 Session ID map saved to: ${mapPath}`);
    console.log(`   Contains ${Object.keys(sessionIdMap).length} mappings`);

    // Summary
    console.log(`\n📈 Migration Results:`);
    console.log(`   - Migrated: ${migrated}`);
    console.log(`   - Already migrated: ${alreadyMigrated}`);
    console.log(`   - Skipped (missing refs): ${skipped}`);
    console.log(`   - Total in new collection: ${await SessionNew.countDocuments()}`);

    console.log('\n✅ Migration 005 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run migration
migrate();
