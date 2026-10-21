const { NGO, Role, Invitation } = require('./model');
const { User } = require('../users/model');
const { File } = require('../files/model');
const { AuditLog } = require('../audit/model');
const { AppError } = require('../../utils/errors');
const { normalizeIndianPhone } = require('../../utils/format');

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
  if (details.registrationType) ngo.registrationType = details.registrationType;
  ngo.registrationNumber = details.registrationNumber;
  if (details.registrationYear) ngo.registrationYear = Number(details.registrationYear);
  if (details.pan) ngo.pan = details.pan.toUpperCase().trim();
  if (details.registration12A) ngo.registration12A = details.registration12A.trim();
  if (details.registration80G) ngo.registration80G = details.registration80G.trim();
  if (details.fcraNumber) ngo.fcraNumber = details.fcraNumber.trim();
  if (details.ngoDarpanId) ngo.ngoDarpanId = details.ngoDarpanId.trim();
  if (details.csr1Number) ngo.csr1Number = details.csr1Number.trim();
  if (details.gstin) ngo.gstin = details.gstin.toUpperCase().trim();

  // Structured address
  if (details.addressLine1) ngo.addressLine1 = details.addressLine1;
  if (details.addressLine2) ngo.addressLine2 = details.addressLine2;
  if (details.city) ngo.city = details.city;
  if (details.district) ngo.district = details.district;
  if (details.state) ngo.state = details.state;
  if (details.pincode) ngo.pincode = details.pincode;
  ngo.country = details.country || 'India';

  const synthesizedAddress = [
    details.addressLine1,
    details.addressLine2,
    details.city,
    details.district,
    details.state ? `${details.state} - ${details.pincode || ''}` : details.pincode,
    details.country || 'India'
  ].filter(Boolean).join(', ');

  ngo.address = details.address || synthesizedAddress || details.addressLine1 || '';

  if (details.contactPhone) {
    ngo.contactPhone = normalizeIndianPhone(details.contactPhone) || details.contactPhone;
  }
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
  if (updateData.registrationType !== undefined) ngo.registrationType = updateData.registrationType;
  if (updateData.registrationNumber !== undefined) ngo.registrationNumber = updateData.registrationNumber;
  if (updateData.registrationYear !== undefined) ngo.registrationYear = Number(updateData.registrationYear);
  if (updateData.pan !== undefined) ngo.pan = updateData.pan.toUpperCase().trim();
  if (updateData.registration12A !== undefined) ngo.registration12A = updateData.registration12A.trim();
  if (updateData.registration80G !== undefined) ngo.registration80G = updateData.registration80G.trim();
  if (updateData.fcraNumber !== undefined) ngo.fcraNumber = updateData.fcraNumber.trim();
  if (updateData.ngoDarpanId !== undefined) ngo.ngoDarpanId = updateData.ngoDarpanId.trim();
  if (updateData.csr1Number !== undefined) ngo.csr1Number = updateData.csr1Number.trim();
  if (updateData.gstin !== undefined) ngo.gstin = updateData.gstin.toUpperCase().trim();

  // Address fields
  if (updateData.addressLine1 !== undefined) ngo.addressLine1 = updateData.addressLine1;
  if (updateData.addressLine2 !== undefined) ngo.addressLine2 = updateData.addressLine2;
  if (updateData.city !== undefined) ngo.city = updateData.city;
  if (updateData.district !== undefined) ngo.district = updateData.district;
  if (updateData.state !== undefined) ngo.state = updateData.state;
  if (updateData.pincode !== undefined) ngo.pincode = updateData.pincode;
  if (updateData.country !== undefined) ngo.country = updateData.country;

  if (updateData.address !== undefined) {
    ngo.address = updateData.address;
  } else if (updateData.addressLine1 || updateData.city || updateData.state) {
    ngo.address = [
      ngo.addressLine1,
      ngo.addressLine2,
      ngo.city,
      ngo.district,
      ngo.state ? `${ngo.state} - ${ngo.pincode || ''}` : ngo.pincode,
      ngo.country || 'India'
    ].filter(Boolean).join(', ');
  }

  if (updateData.contactPhone !== undefined) {
    ngo.contactPhone = normalizeIndianPhone(updateData.contactPhone) || updateData.contactPhone;
  }
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
