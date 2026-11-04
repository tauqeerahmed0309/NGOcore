const mongoose = require('mongoose');
const config = require('../config/env');
const Ngo = require('../models/Ngo');
const User = require('../models/User');
const Student = require('../models/Student');
const Program = require('../models/Program');
const AuditLog = require('../models/AuditLog');

const backfill = (Model, ngoId) => Model.updateMany(
  { $or: [{ ngoId: { $exists: false } }, { ngoId: null }] },
  { $set: { ngoId } }
);

const dropOldUniqueIndex = async (Model, field) => {
  const indexes = await Model.collection.indexes();
  const legacyUnique = indexes.find((index) =>
    index.unique &&
    Object.keys(index.key).length === 1 &&
    index.key[field] === 1
  );
  if (legacyUnique) {
    await Model.collection.dropIndex(legacyUnique.name);
    console.log(`Dropped legacy global unique index on ${Model.collection.collectionName}.${field}.`);
  }
};

const migrateLegacyNgo = async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    const ngo = await Ngo.findOneAndUpdate(
      { name: 'Legacy NGO (Migrated)' },
      {
        $setOnInsert: {
          status: 'approved',
          contactEmail: config.ADMIN_EMAIL.toLowerCase().trim()
        }
      },
      { upsert: true, returnDocument: 'after' }
    );

    const counts = await Promise.all([
      backfill(User, ngo._id),
      backfill(Student, ngo._id),
      backfill(Program, ngo._id),
      backfill(AuditLog, ngo._id)
    ]);

    await dropOldUniqueIndex(Student, 'registrationNumber');
    await dropOldUniqueIndex(Program, 'code');
    await Student.collection.createIndex({ ngoId: 1, registrationNumber: 1 }, { unique: true });
    await Program.collection.createIndex({ ngoId: 1, code: 1 }, { unique: true });

    console.log(`Legacy NGO migration complete: ${counts.reduce((sum, result) => sum + result.modifiedCount, 0)} documents assigned to the approved legacy organization.`);
  } catch (error) {
    console.error(`Legacy NGO migration failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

migrateLegacyNgo();
