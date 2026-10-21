const crypto = require('crypto');
const { Consent, DataRequest } = require('./model');
const { Record, RecordType } = require('../records/model');
const recordsService = require('../records/records.service');
const { AuditLog } = require('../audit/model');
const { AppError } = require('../../utils/errors');

class PrivacyService {
  /**
   * Record or update consent for a beneficiary record
   */
  async grantConsent(ngoId, { recordId, purpose, proofType = 'Written Form', witnessName, validUntil }, user = null, ip = null, userAgent = null) {
    const record = await Record.findOne({ _id: recordId, ngoId, isDeleted: false });
    if (!record) {
      throw new AppError(404, 'Beneficiary record not found');
    }

    const consent = await Consent.findOneAndUpdate(
      { ngoId, recordId, purpose },
      {
        $set: {
          status: 'granted',
          proofType,
          witnessName: witnessName || '',
          validUntil: validUntil ? new Date(validUntil) : null,
          ip: ip || '',
          userAgent: userAgent || ''
        }
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );

    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'GRANT_CONSENT',
        resource: 'consents',
        resourceId: consent._id,
        details: { recordNumber: record.recordNumber, purpose, proofType },
        ip,
        userAgent
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return consent;
  }

  /**
   * Withdraw / revoke an existing consent
   */
  async withdrawConsent(ngoId, consentId, { reason } = {}, user = null, ip = null, userAgent = null) {
    const consent = await Consent.findOne({ _id: consentId, ngoId });
    if (!consent) {
      throw new AppError(404, 'Consent record not found');
    }

    consent.status = 'withdrawn';
    await consent.save();

    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'WITHDRAW_CONSENT',
        resource: 'consents',
        resourceId: consent._id,
        details: { purpose: consent.purpose, reason: reason || 'Withdrawn by data subject request' },
        ip,
        userAgent
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return consent;
  }

  /**
   * Get all active and historical consents for a beneficiary record
   */
  async getConsentsByRecord(ngoId, recordId) {
    const consents = await Consent.find({ ngoId, recordId }).sort({ createdAt: -1 });
    return consents;
  }

  /**
   * Execute DPDP / GDPR Right to be Forgotten (Cryptographic PII Redaction)
   * Scrubs identifying fields while preserving mathematical hash chain integrity
   */
  async executeRightToBeForgotten(ngoId, { recordId, requestedBy, reason }, user = null, ip = null, userAgent = null) {
    const record = await Record.findOne({ _id: recordId, ngoId, isDeleted: false })
      .populate('recordTypeId');

    if (!record) {
      throw new AppError(404, 'Record not found');
    }

    const recordType = record.recordTypeId;
    const rawData = record.data instanceof Map ? Object.fromEntries(record.data) : (record.data || {});
    const redactedFields = [];

    // Redact all sensitive fields and common PII keys
    const piiFieldKeys = new Set([
      'full_name', 'name', 'phone', 'national_id', 'address', 'emergency_contact',
      'patient_name', 'medical_notes', 'email'
    ]);

    (recordType?.fields || []).forEach(f => {
      if (f.isSensitive || f.type === 'Encrypted Text' || piiFieldKeys.has(f.key)) {
        piiFieldKeys.add(f.key);
      }
    });

    const scrubbedData = { ...rawData };
    piiFieldKeys.forEach(k => {
      if (scrubbedData[k] !== undefined) {
        scrubbedData[k] = '[REDACTED_DPDP_RIGHT_TO_ERASURE]';
        redactedFields.push(k);
      }
    });

    record.data = scrubbedData;
    record.status = 'Archived';
    record.encryptedFields = []; // Values are now redacted tokens, not ciphertext
    if (user) record.updatedBy = user._id;
    await record.save();

    // Mark all linked consents as revoked
    await Consent.updateMany(
      { ngoId, recordId },
      { $set: { status: 'withdrawn' } }
    );

    // Generate cryptographic anonymization certificate
    const timestamp = new Date();
    const certificateNumber = `DPDP-ERASURE-${Date.now().toString(36).toUpperCase()}`;
    const proofPayload = `${record._id}:${ngoId}:${certificateNumber}:${timestamp.toISOString()}:${requestedBy}:${user?._id || 'compliance'}`;
    const sha256Proof = crypto.createHash('sha256').update(proofPayload).digest('hex');

    const certificate = {
      certificateNumber,
      sha256Proof,
      anonymizedAt: timestamp,
      operatorId: user?._id || null,
      redactedFields
    };

    const dataRequest = await DataRequest.create({
      ngoId,
      recordId: record._id,
      requestType: 'Erasure',
      status: 'Completed',
      requestedBy: requestedBy || 'Data Subject',
      reason: reason || 'DPDP Right to Erasure Request',
      certificate
    });

    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'RIGHT_TO_BE_FORGOTTEN_EXECUTED',
        resource: 'privacy',
        resourceId: dataRequest._id,
        details: {
          recordNumber: record.recordNumber,
          certificateNumber,
          sha256Proof,
          redactedFieldsCount: redactedFields.length
        },
        ip,
        userAgent
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return {
      success: true,
      message: 'PII cryptographically redacted and certificate issued.',
      certificate,
      record: recordsService.decryptRecord(record, recordType)
    };
  }

  /**
   * Subject Access Request (SAR): Export all personal data & consents linked to a beneficiary
   */
  async exportSubjectAccessData(ngoId, recordId, user = null, ip = null, userAgent = null) {
    const record = await recordsService.getRecordById(ngoId, recordId);
    if (!record) {
      throw new AppError(404, 'Record not found');
    }

    const [consents, auditLogs, erasureRequests] = await Promise.all([
      Consent.find({ ngoId, recordId }).lean(),
      AuditLog.find({ ngoId, resourceId: recordId }).lean(),
      DataRequest.find({ ngoId, recordId }).lean()
    ]);

    const sarPackage = {
      exportVersion: '1.0-DPDP',
      exportedAt: new Date().toISOString(),
      organizationVaultId: ngoId,
      complianceStandard: 'DPDP Act 2023 / GDPR Article 15',
      subjectProfile: {
        recordId: record._id,
        recordNumber: record.recordNumber,
        status: record.status,
        data: record.data,
        createdAt: record.createdAt
      },
      consentHistory: consents.map(c => ({
        purpose: c.purpose,
        status: c.status,
        proofType: c.proofType,
        witnessName: c.witnessName,
        grantedAt: c.createdAt,
        validUntil: c.validUntil
      })),
      privacyRequests: erasureRequests,
      auditHistory: auditLogs.map(l => ({
        action: l.action,
        timestamp: l.createdAt,
        sha256Hash: l.hash
      }))
    };

    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'SUBJECT_ACCESS_REQUEST_EXPORTED',
        resource: 'privacy',
        resourceId: record._id,
        details: { recordNumber: record.recordNumber },
        ip,
        userAgent
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return sarPackage;
  }
}

module.exports = new PrivacyService();
