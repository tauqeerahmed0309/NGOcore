const mongoose = require('mongoose');
const config = require('../config/env');
const Ngo = require('../models/Ngo');

const [ngoId, status] = process.argv.slice(2);
const allowedStatuses = ['approved', 'rejected', 'suspended'];

if (!mongoose.isValidObjectId(ngoId) || !allowedStatuses.includes(status)) {
  console.error('Usage: node src/scripts/setNgoStatus.js <ngoId> <approved|rejected|suspended>');
  process.exit(1);
}

(async () => {
  try {
    await mongoose.connect(config.MONGODB_URI);
    const existing = await Ngo.findById(ngoId);
    if (!existing) throw new Error('Organization not found.');
    if (status === 'approved' && !existing.approvalSubmitted) {
      throw new Error('Organization must complete email verification and onboarding with a supporting document before approval.');
    }
    existing.status = status;
    const ngo = await existing.save();
    if (!ngo) throw new Error('Organization not found.');
    console.log(`Organization "${ngo.name}" status set to ${ngo.status}.`);
  } catch (error) {
    console.error(`Could not update organization status: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
