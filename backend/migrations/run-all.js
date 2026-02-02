/**
 * Migration Runner
 *
 * Runs all migrations in sequence.
 *
 * Usage:
 *   node migrations/run-all.js           # Run all migrations
 *   node migrations/run-all.js --dry-run # Show what would run
 *   node migrations/run-all.js --from 3  # Start from migration 3
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const MIGRATIONS = [
  { num: 1, file: '001-migrate-students.js', desc: 'Migrate Students' },
  { num: 2, file: '002-migrate-faculty.js', desc: 'Migrate Faculty' },
  { num: 3, file: '003-create-subjects.js', desc: 'Create Subjects' },
  { num: 4, file: '004-create-teachings.js', desc: 'Create Teaching Assignments' },
  { num: 5, file: '005-migrate-sessions.js', desc: 'Migrate Sessions' },
  { num: 6, file: '006-migrate-attendance.js', desc: 'Migrate Attendance' }
];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    from: 1
  };

  const fromIdx = args.indexOf('--from');
  if (fromIdx !== -1 && args[fromIdx + 1]) {
    options.from = parseInt(args[fromIdx + 1], 10);
  }

  return options;
}

function runMigration(migration) {
  const filePath = path.join(__dirname, migration.file);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${migration.file}`);
    return false;
  }

  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Running: ${migration.file}`);
    console.log(`${'='.repeat(60)}\n`);

    execSync(`node "${filePath}"`, {
      stdio: 'inherit',
      cwd: __dirname
    });

    return true;
  } catch (error) {
    console.error(`❌ Migration ${migration.num} failed!`);
    return false;
  }
}

async function main() {
  const options = parseArgs();

  console.log('🚀 DynaQR Database Migration Runner\n');
  console.log('Migrations to run:');

  const toRun = MIGRATIONS.filter(m => m.num >= options.from);

  toRun.forEach(m => {
    console.log(`  ${m.num}. ${m.desc} (${m.file})`);
  });

  if (options.dryRun) {
    console.log('\n--dry-run specified. No migrations executed.');
    process.exit(0);
  }

  console.log(`\nStarting from migration ${options.from}...`);
  console.log('Press Ctrl+C to abort.\n');

  // Small delay to allow abort
  await new Promise(r => setTimeout(r, 2000));

  let successful = 0;

  for (const migration of toRun) {
    const success = runMigration(migration);

    if (!success) {
      console.error(`\n❌ Migration ${migration.num} failed. Stopping.`);
      console.log(`   To resume, run: node migrations/run-all.js --from ${migration.num}`);
      process.exit(1);
    }

    successful++;
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`✅ All ${successful} migration(s) completed successfully!`);
  console.log(`${'='.repeat(60)}\n`);

  console.log('Next steps:');
  console.log('  1. Run validation: node migrations/validate.js');
  console.log('  2. Update application code to use new models');
  console.log('  3. After verification, clean up old collections');
}

main().catch(console.error);
