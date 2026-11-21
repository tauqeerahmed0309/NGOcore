/**
 * NGOcore — Enrollment Counter Reconciliation Migration Script
 *
 * Idempotently reconciles `enrolledCount` on Program documents against
 * the authoritative count of active ProgramEnrollment records (`status: 'enrolled'`).
 *
 * Usage:
 *   Dry-run mode (default, read-only):
 *     node src/scripts/reconcileProgramEnrollments.js
 *     node src/scripts/reconcileProgramEnrollments.js --dry-run
 *
 *   Apply mode (modifies counters in target database):
 *     node src/scripts/reconcileProgramEnrollments.js --apply
 *
 * Safety guarantees:
 * - Default execution is 100% read-only dry-run.
 * - Requires explicit '--apply' flag to execute updates.
 * - Never modifies enrollment records or attendance history.
 * - Idempotent: repeated runs produce identical, consistent counts.
 * - Scoped strictly by NGO boundary.
 */

const mongoose = require('mongoose');
const config = require('../config/env');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const { connectDB, maskMongoUri } = require('../config/db');

/**
 * Reconciles enrolledCount across programs.
 * @param {Object} options
 * @param {boolean} options.dryRun - If true, only reports discrepancies without updating.
 * @param {string|mongoose.Types.ObjectId} [options.ngoId] - Optional specific NGO scope.
 * @param {string|mongoose.Types.ObjectId} [options.programId] - Optional specific Program scope.
 * @returns {Promise<Object>} Summary of reconciliation results.
 */
const reconcileEnrollmentCounters = async (options = {}) => {
  const dryRun = options.dryRun !== false; // Default to true for safety
  const ngoId = options.ngoId || null;
  const programId = options.programId || null;

  const programFilter = {};
  if (ngoId) programFilter.ngoId = ngoId;
  if (programId) programFilter._id = programId;

  // 1. Fetch all matching programs
  const programs = await Program.find(programFilter).lean();

  // 2. Fetch authoritative active enrollment counts via aggregation grouped by program
  const matchEnrollments = { status: 'enrolled' };
  if (ngoId) matchEnrollments.ngoId = new mongoose.Types.ObjectId(String(ngoId));
  if (programId) matchEnrollments.programId = new mongoose.Types.ObjectId(String(programId));

  const activeAgg = await ProgramEnrollment.aggregate([
    { $match: matchEnrollments },
    {
      $group: {
        _id: '$programId',
        activeCount: { $sum: 1 }
      }
    }
  ]);

  const activeCountMap = new Map(activeAgg.map((a) => [String(a._id), a.activeCount]));

  const discrepancies = [];
  const updates = [];

  for (const prog of programs) {
    const pidStr = String(prog._id);
    const actualActive = activeCountMap.get(pidStr) || 0;
    const storedCount = prog.enrolledCount;
    const hasField = Object.prototype.hasOwnProperty.call(prog, 'enrolledCount');

    const isMismatch = storedCount !== actualActive || !hasField;

    if (isMismatch) {
      discrepancies.push({
        programId: pidStr,
        code: prog.code,
        name: prog.name,
        ngoId: String(prog.ngoId),
        status: prog.status,
        capacity: prog.capacity,
        hasField,
        storedCount,
        actualActive
      });

      // Optimistic concurrency control filter:
      // Only apply reconciliation if enrolledCount in DB has not changed since our read.
      // This guarantees reconciliation NEVER overwrites a newer reservation with a stale count.
      const matchFilter = { _id: prog._id };
      if (!hasField || storedCount === null || storedCount === undefined) {
        matchFilter.$or = [{ enrolledCount: { $exists: false } }, { enrolledCount: null }];
      } else {
        matchFilter.enrolledCount = storedCount;
      }

      updates.push({
        updateOne: {
          filter: matchFilter,
          update: { $set: { enrolledCount: actualActive } }
        }
      });
    }
  }

  let modifiedCount = 0;
  if (!dryRun && updates.length > 0) {
    const bulkResult = await Program.bulkWrite(updates, { ordered: false });
    modifiedCount = bulkResult.modifiedCount || 0;
  }

  return {
    dryRun,
    totalProgramsAudited: programs.length,
    discrepancyCount: discrepancies.length,
    discrepancies,
    modifiedCount
  };
};

// Direct CLI Execution
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const isApply = args.includes('--apply');
    const dryRun = !isApply;

    console.log('================================================================');
    console.log('   NGOCORE — ENROLLMENT COUNTER RECONCILIATION MIGRATION TOOL  ');
    console.log(`   Mode: ${dryRun ? 'DRY-RUN (Read-Only Safety Inspection)' : 'APPLY (Writing changes to database)'}`);
    console.log('================================================================\n');

    try {
      await connectDB();

      const dbName = mongoose.connection.name || 'unknown';
      const dbHost = mongoose.connection.host || 'unknown';
      const targetUri = maskMongoUri(process.env.MONGODB_URI || config.MONGODB_URI || '');
      const isLocal = dbHost.includes('127.0.0.1') || dbHost.includes('localhost');

      console.log(`Environment:      ${process.env.NODE_ENV || 'development'}`);
      console.log(`Target Database:  ${dbName} (${isLocal ? 'Local Instance' : 'Remote / Atlas Cluster'})`);
      console.log(`Host:             ${dbHost}`);
      console.log(`Connection URI:   ${targetUri}`);
      console.log('----------------------------------------------------------------\n');

      const result = await reconcileEnrollmentCounters({ dryRun });

      console.log(`Audited Programs: ${result.totalProgramsAudited}`);
      console.log(`Discrepancies Identified: ${result.discrepancyCount}\n`);

      if (result.discrepancies.length > 0) {
        console.table(
          result.discrepancies.map((d) => ({
            Code: d.code,
            Name: d.name,
            Status: d.status,
            Capacity: d.capacity ?? 'Unlimited',
            HasField: d.hasField,
            StoredCount: d.storedCount,
            ActualActive: d.actualActive,
            Action: dryRun ? 'Needs Sync' : 'Reconciled'
          }))
        );
      } else {
        console.log('✅ All programs have 100% synchronized enrolledCount values.');
      }

      if (dryRun) {
        console.log('\n[SAFETY NOTICE]: Dry-run completed. No records were modified.');
        console.log('To apply these reconciliation updates, rerun with: node src/scripts/reconcileProgramEnrollments.js --apply\n');
      } else {
        console.log(`\n✅ Apply completed successfully. Reconciled ${result.modifiedCount} program documents.\n`);
      }
    } catch (err) {
      console.error('Fatal reconciliation error:', err);
      process.exitCode = 1;
    } finally {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    }
  })();
}

module.exports = { reconcileEnrollmentCounters };
