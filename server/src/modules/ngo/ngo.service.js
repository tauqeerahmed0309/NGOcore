const { NGO, Role, Invitation } = require('./model');
const { User } = require('../users/model');
const { File } = require('../files/model');
const { AuditLog } = require('../audit/model');
const { AppError } = require('../../utils/errors');

/**
 * Onboard NGO with details and supporting verification documents
 */
const onboardNgo = async (ngoId, details, documents, userId) => {
  const ngo = await NGO.findById(ngoId);
  if (!ngo) throw new AppError(404, 'NGO not found');
  if (ngo.status !== 'unverified') throw new AppError(400, 'NGO is already onboarded');

  if (documents.length === 0) {
    throw new AppError(400, 'At least one supporting document is required');
  }

  // Update NGO details
  ngo.name = details.name;
  ngo.type = details.type;
  ngo.registrationNumber = details.registrationNumber;
  ngo.address = details.address;
  if (details.contactPhone) ngo.contactPhone = details.contactPhone;
  ngo.status = 'pending'; // Moves to pending approval
  
  await ngo.save();

  // Save documents in File collection
  const fileDocs = documents.map(doc => ({
    ngoId,
    originalName: doc.originalName,
    mimeType: doc.originalName.split('.').pop(),
    size: 0,
    url: doc.url,
    publicId: doc.publicId,
    uploadedBy: userId
  }));
  
  await File.insertMany(fileDocs);

  await AuditLog.create({
    ngoId,
    userId,
    action: 'ONBOARDING_COMPLETED',
    resource: 'NGO',
    resourceId: ngo._id,
    details: { documentsCount: documents.length }
  });

  return { ngoId, status: ngo.status };
};

/**
 * Fetch detailed NGO profile, organizational settings, and team stats
 */
const getNgoProfile = async (ngoId) => {
  const ngo = await NGO.findById(ngoId);
  if (!ngo) {
    throw new AppError(404, 'Organization not found');
  }

  // Compute organization telemetry
  const [staffCount, rolesCount, pendingInvitationsCount] = await Promise.all([
    User.countDocuments({ ngoId, status: { $in: ['active', 'inactive'] } }),
    Role.countDocuments({ ngoId }),
    Invitation.countDocuments({ ngoId, status: 'pending' })
  ]);

  return {
    ...ngo.toObject(),
    stats: {
      staffCount,
      rolesCount,
      pendingInvitationsCount
    }
  };
};

/**
 * Update NGO Profile information (logo, legal info, contact info, website, mission)
 */
const updateNgoProfile = async (ngoId, updateData = {}, logoFile, userId, meta = {}) => {
  const ngo = await NGO.findById(ngoId);
  if (!ngo) {
    throw new AppError(404, 'Organization not found');
  }

  // Handle Logo
  if (logoFile) {
    ngo.logoUrl = logoFile.secure_url || logoFile.url || (logoFile.filename ? `/uploads/${logoFile.filename}` : logoFile.path);
  } else if (updateData.logoUrl !== undefined) {
    ngo.logoUrl = updateData.logoUrl;
  }

  // Update allowed metadata fields
  if (updateData.name) ngo.name = updateData.name;
  if (updateData.type !== undefined) ngo.type = updateData.type;
  if (updateData.registrationNumber !== undefined) ngo.registrationNumber = updateData.registrationNumber;
  if (updateData.address !== undefined) ngo.address = updateData.address;
  if (updateData.contactPhone !== undefined) ngo.contactPhone = updateData.contactPhone;
  if (updateData.website !== undefined) ngo.website = updateData.website;
  if (updateData.description !== undefined) ngo.description = updateData.description;

  await ngo.save();

  await AuditLog.create({
    ngoId,
    userId,
    action: 'NGO_PROFILE_UPDATED',
    resource: 'NGO',
    resourceId: ngo._id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    details: {
      updatedFields: Object.keys(updateData),
      hasLogo: !!(logoFile || updateData.logoUrl)
    }
  });

  return await getNgoProfile(ngoId);
};

/**
 * Update NGO Tenant Settings (currency, timezone, retention, security)
 */
const updateNgoSettings = async (ngoId, newSettings = {}, userId, meta = {}) => {
  const ngo = await NGO.findById(ngoId);
  if (!ngo) {
    throw new AppError(404, 'Organization not found');
  }

  if (!ngo.settings) {
    ngo.settings = {};
  }

  if (newSettings.currency !== undefined) ngo.settings.currency = newSettings.currency;
  if (newSettings.timezone !== undefined) ngo.settings.timezone = newSettings.timezone;
  if (newSettings.dateFormat !== undefined) ngo.settings.dateFormat = newSettings.dateFormat;
  if (newSettings.retentionDays !== undefined) ngo.settings.retentionDays = newSettings.retentionDays;
  if (newSettings.require2FA !== undefined) ngo.settings.require2FA = newSettings.require2FA;
  if (newSettings.sessionTimeoutMinutes !== undefined) ngo.settings.sessionTimeoutMinutes = newSettings.sessionTimeoutMinutes;

  if (newSettings.emailNotifications) {
    if (!ngo.settings.emailNotifications) {
      ngo.settings.emailNotifications = {};
    }
    const notifs = newSettings.emailNotifications;
    if (notifs.notifyOnNewMember !== undefined) {
      ngo.settings.emailNotifications.notifyOnNewMember = notifs.notifyOnNewMember;
    }
    if (notifs.notifyOnRecordExport !== undefined) {
      ngo.settings.emailNotifications.notifyOnRecordExport = notifs.notifyOnRecordExport;
    }
    if (notifs.notifyOnSecurityAlert !== undefined) {
      ngo.settings.emailNotifications.notifyOnSecurityAlert = notifs.notifyOnSecurityAlert;
    }
  }

  ngo.markModified('settings');
  await ngo.save();

  await AuditLog.create({
    ngoId,
    userId,
    action: 'NGO_SETTINGS_UPDATED',
    resource: 'NGO',
    resourceId: ngo._id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    details: {
      settingsChanged: Object.keys(newSettings)
    }
  });

  return ngo.settings;
};

module.exports = {
  onboardNgo,
  getNgoProfile,
  updateNgoProfile,
  updateNgoSettings
};
