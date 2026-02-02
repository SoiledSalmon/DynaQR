/**
 * Migration: 002 - Migrate Faculty
 *
 * Migrates data from MasterFaculty + User (role=faculty) to the new Faculty collection.
 *
 * Strategy:
 * 1. Insert all MasterFaculty records as is_registered=false (whitelist)
 * 2. For each User with role=faculty, update corresponding Faculty record:
 *    - Set password
 *    - Set is_registered=true
 */

// --- DNS FIX ---
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);
// ---------------

const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '..', '.env') });

// Models
const MasterFaculty = require('../models/MasterFaculty');
const User = require('../models/User');
const Faculty = require('../models/Faculty');

const connectDB = require('../config/db');

async function migrate() {
  console.log('🚀 Starting Migration 002: Migrate Faculty...\n');

  try {
    await connectDB();

    // Step 1: Count existing data
    const masterCount = await MasterFaculty.countDocuments();
    const userFacultyCount = await User.countDocuments({ role: 'faculty' });

    console.log(`📊 Found ${masterCount} MasterFaculty records`);
    console.log(`📊 Found ${userFacultyCount} User (faculty) records\n`);

    if (masterCount === 0) {
      console.log('⚠️  No MasterFaculty records found. Nothing to migrate.');
      process.exit(0);
    }

    // Step 2: Get all master records
    const masterFaculty = await MasterFaculty.find({}).lean();

    // Step 3: Get all registered users (for password + is_registered)
    const registeredUsers = await User.find({ role: 'faculty' })
      .select('+password')
      .lean();

    // Create a map for quick lookup
    const userMap = new Map();
    for (const user of registeredUsers) {
      userMap.set(user.email.toLowerCase(), user);
    }

    // Step 4: Prepare bulk operations
    const bulkOps = [];

    for (const master of masterFaculty) {
      const email = master.email.toLowerCase();
      const registeredUser = userMap.get(email);

      const facultyData = {
        email: email,
        name: master.name,
        emp_id: master.emp_id.toUpperCase(),
        department: master.department,
        is_registered: !!registeredUser,
        password: registeredUser?.password || null
      };

      bulkOps.push({
        updateOne: {
          filter: { email: email },
          update: { $set: facultyData },
          upsert: true
        }
      });
    }

    // Step 5: Execute bulk operation
    if (bulkOps.length > 0) {
      const result = await Faculty.bulkWrite(bulkOps, { ordered: false });
      console.log(`✅ Bulk operation complete:`);
      console.log(`   - Upserted: ${result.upsertedCount}`);
      console.log(`   - Modified: ${result.modifiedCount}`);
    }

    // Step 6: Verify migration
    const newFacultyCount = await Faculty.countDocuments();
    const registeredCount = await Faculty.countDocuments({ is_registered: true });

    console.log(`\n📈 Migration Results:`);
    console.log(`   - Total Faculty records: ${newFacultyCount}`);
    console.log(`   - Registered faculty: ${registeredCount}`);
    console.log(`   - Whitelist only: ${newFacultyCount - registeredCount}`);

    console.log('\n✅ Migration 002 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 11000) {
      console.error('   Duplicate key error. Check for conflicting records.');
    }
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

// Run migration
migrate();
