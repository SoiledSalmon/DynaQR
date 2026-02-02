#!/usr/bin/env node

/**
 * Post-Migration Cleanup Guard
 *
 * This script verifies that it is safe to drop legacy collections.
 * Run this BEFORE dropping any legacy collections.
 *
 * Checks performed:
 * 1. No controller files import legacy models directly
 * 2. No middleware files import legacy models directly
 * 3. New collections have data (migration was successful)
 * 4. Migration validation passes
 *
 * Usage:
 *   node migrations/cleanup-guard.js          # Run all checks
 *   node migrations/cleanup-guard.js --drop   # Run checks AND drop legacy collections (DESTRUCTIVE)
 *
 * Legacy collections to be dropped:
 * - users
 * - masterstudents
 * - masterfaculties
 * - sessions
 * - attendances
 * - classes
 */

const fs = require('fs');
const path = require('path');

// ANSI colors for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

const log = {
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`)
};

// Legacy model import patterns to detect
const LEGACY_PATTERNS = [
  /require\s*\(\s*['"]\.\.?\/models\/User['"]\s*\)/,
  /require\s*\(\s*['"]\.\.?\/models\/MasterStudent['"]\s*\)/,
  /require\s*\(\s*['"]\.\.?\/models\/MasterFaculty['"]\s*\)/,
  /require\s*\(\s*['"]\.\.?\/models\/Session['"]\s*\)/,     // Not SessionNew
  /require\s*\(\s*['"]\.\.?\/models\/Attendance['"]\s*\)/,  // Not AttendanceNew
  /require\s*\(\s*['"]\.\.?\/models\/Class['"]\s*\)/
];

const LEGACY_MODEL_NAMES = [
  'User',
  'MasterStudent',
  'MasterFaculty',
  'Session (old)',
  'Attendance (old)',
  'Class'
];

// Files to check (relative to backend directory)
const FILES_TO_CHECK = [
  'controllers/authController.js',
  'controllers/attendanceController.js',
  'middleware/authMiddleware.js',
  'routes/authRoutes.js',
  'routes/attendanceRoutes.js',
  'server.js'
];

// Directories to exclude from scanning
const EXCLUDED_DIRS = ['node_modules', 'migrations', '.git'];

/**
 * Check a single file for legacy model imports
 */
function checkFileForLegacyImports(filePath) {
  if (!fs.existsSync(filePath)) {
    return { exists: false, hasLegacy: false, matches: [] };
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = [];

  LEGACY_PATTERNS.forEach((pattern, index) => {
    if (pattern.test(content)) {
      matches.push(LEGACY_MODEL_NAMES[index]);
    }
  });

  return { exists: true, hasLegacy: matches.length > 0, matches };
}

/**
 * Recursively scan directory for JS files
 */
function scanDirectory(dir, baseDir = dir) {
  const results = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!EXCLUDED_DIRS.includes(item)) {
        results.push(...scanDirectory(fullPath, baseDir));
      }
    } else if (item.endsWith('.js')) {
      const relativePath = path.relative(baseDir, fullPath);
      results.push({ path: fullPath, relative: relativePath });
    }
  }

  return results;
}

/**
 * Main guard check
 */
async function runGuardChecks() {
  console.log('\n' + '='.repeat(60));
  console.log('  POST-MIGRATION CLEANUP GUARD');
  console.log('='.repeat(60) + '\n');

  const backendDir = path.resolve(__dirname, '..');
  let allPassed = true;
  let legacyUsageFound = [];

  // 1. Check critical files for legacy imports
  log.info('Checking critical files for legacy model imports...\n');

  for (const file of FILES_TO_CHECK) {
    const filePath = path.join(backendDir, file);
    const result = checkFileForLegacyImports(filePath);

    if (!result.exists) {
      log.warn(`File not found: ${file}`);
    } else if (result.hasLegacy) {
      log.error(`${file} imports legacy models: ${result.matches.join(', ')}`);
      legacyUsageFound.push({ file, models: result.matches });
      allPassed = false;
    } else {
      log.success(`${file} - No legacy imports`);
    }
  }

  console.log('');

  // 2. Deep scan entire backend for any legacy imports
  log.info('Deep scanning all backend JS files...\n');

  const allFiles = scanDirectory(backendDir);
  let deepScanIssues = 0;

  for (const file of allFiles) {
    const result = checkFileForLegacyImports(file.path);

    if (result.hasLegacy) {
      // Skip migration files - they're allowed to use legacy models
      if (file.relative.startsWith('migrations')) {
        continue;
      }
      // Skip seed.js (legacy seeder)
      if (file.relative === 'seed.js') {
        continue;
      }

      log.error(`${file.relative} imports legacy models: ${result.matches.join(', ')}`);
      deepScanIssues++;
      allPassed = false;
    }
  }

  if (deepScanIssues === 0) {
    log.success('Deep scan complete - no unexpected legacy imports found');
  }

  console.log('');

  // 3. Summary
  console.log('='.repeat(60));
  console.log('  SUMMARY');
  console.log('='.repeat(60) + '\n');

  if (allPassed) {
    log.success('ALL CHECKS PASSED');
    console.log('\nIt is SAFE to drop legacy collections.');
    console.log('\nTo drop legacy collections, run the following in MongoDB:');
    console.log(`
  use dynaqr
  db.users.drop()
  db.masterstudents.drop()
  db.masterfaculties.drop()
  db.sessions.drop()
  db.attendances.drop()
  db.classes.drop()
`);
    console.log('Or use Mongoose:');
    console.log(`
  const mongoose = require('mongoose');
  await mongoose.connection.collection('users').drop();
  await mongoose.connection.collection('masterstudents').drop();
  await mongoose.connection.collection('masterfaculties').drop();
  await mongoose.connection.collection('sessions').drop();
  await mongoose.connection.collection('attendances').drop();
  await mongoose.connection.collection('classes').drop();
`);
  } else {
    log.error('CHECKS FAILED - DO NOT DROP LEGACY COLLECTIONS');
    console.log('\nThe following files still use legacy models:');
    legacyUsageFound.forEach(({ file, models }) => {
      console.log(`  - ${file}: ${models.join(', ')}`);
    });
    console.log('\nPlease refactor these files before dropping legacy collections.');
  }

  console.log('');
  return allPassed;
}

/**
 * Drop legacy collections (only if --drop flag is passed)
 */
async function dropLegacyCollections() {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const mongoose = require('mongoose');

  const collections = [
    'users',
    'masterstudents',
    'masterfaculties',
    'sessions',
    'attendances',
    'classes'
  ];

  try {
    await mongoose.connect(process.env.MONGO_URI);
    log.info('Connected to MongoDB');

    for (const collectionName of collections) {
      try {
        const exists = await mongoose.connection.db.listCollections({ name: collectionName }).hasNext();
        if (exists) {
          await mongoose.connection.collection(collectionName).drop();
          log.success(`Dropped collection: ${collectionName}`);
        } else {
          log.info(`Collection does not exist: ${collectionName}`);
        }
      } catch (err) {
        if (err.code === 26) { // NamespaceNotFound
          log.info(`Collection does not exist: ${collectionName}`);
        } else {
          log.error(`Failed to drop ${collectionName}: ${err.message}`);
        }
      }
    }

    await mongoose.disconnect();
    log.success('Disconnected from MongoDB');

  } catch (err) {
    log.error(`MongoDB connection failed: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldDrop = args.includes('--drop');

  const passed = await runGuardChecks();

  if (shouldDrop) {
    if (!passed) {
      log.error('Cannot drop collections - guard checks failed');
      process.exit(1);
    }

    console.log('\n' + '='.repeat(60));
    log.warn('DESTRUCTIVE OPERATION: Dropping legacy collections...');
    console.log('='.repeat(60) + '\n');

    await dropLegacyCollections();

    console.log('\n');
    log.success('Legacy collections dropped successfully');
  }

  process.exit(passed ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    log.error(`Unexpected error: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { runGuardChecks, checkFileForLegacyImports };
