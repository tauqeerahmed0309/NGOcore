const { AuditLog, GENESIS_HASH, calculateLogHash } = require('./model');
const { User } = require('../users/model');
const { AppError } = require('../../utils/errors');

class AuditService {
  /**
   * List paginated audit logs for an NGO tenant with filtering
   */
  async getAuditLogs(ngoId, {
    page = 1,
    limit = 25,
    action,
    resource,
    userId,
    startDate,
    endDate,
    search
  } = {}) {
    const query = { ngoId };

    if (action) {
      query.action = action;
    }

    if (resource) {
      query.resource = resource;
    }

    if (userId) {
      query.userId = userId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { action: searchRegex },
        { resource: searchRegex },
        { ip: searchRegex }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total, actionStats, latestLog] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('userId', 'name email designation avatarUrl')
        .lean(),
      AuditLog.countDocuments(query),
      AuditLog.aggregate([
        { $match: { ngoId } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.findOne({ ngoId }, { hash: 1 }, { sort: { createdAt: -1 } })
    ]);

    return {
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      },
      actionStats,
      currentRootHash: latestLog ? latestLog.hash : GENESIS_HASH
    };
  }

  /**
   * Cryptographically verify the SHA-256 hash chain of all audit logs for an NGO
   */
  async verifyChainIntegrity(ngoId) {
    const logs = await AuditLog.find({ ngoId })
      .sort({ createdAt: 1, _id: 1 })
      .lean();

    if (logs.length === 0) {
      return {
        isValid: true,
        totalLogsVerified: 0,
        rootHash: GENESIS_HASH,
        message: 'No audit records to verify. Genesis state intact.',
        verifiedAt: new Date().toISOString()
      };
    }

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const expectedPrevHash = i === 0 ? GENESIS_HASH : logs[i - 1].hash;

      // Check 1: previousHash pointer matches the previous block's hash
      if (log.previousHash !== expectedPrevHash) {
        return {
          isValid: false,
          totalLogsVerified: i,
          failedLogId: log._id,
          index: i,
          error: `Broken hash chain pointer at record #${i + 1}. Expected previousHash "${expectedPrevHash}", but found "${log.previousHash}".`,
          verifiedAt: new Date().toISOString()
        };
      }

      // Check 2: Recalculated SHA-256 hash matches the stored hash
      const computedHash = calculateLogHash(log, log.previousHash);
      if (log.hash && log.hash !== computedHash) {
        return {
          isValid: false,
          totalLogsVerified: i,
          failedLogId: log._id,
          index: i,
          error: `Cryptographic payload tampering detected at record #${i + 1}. Stored hash "${log.hash}" does not match recomputed hash "${computedHash}".`,
          verifiedAt: new Date().toISOString()
        };
      }
    }

    const rootHash = logs[logs.length - 1].hash;

    return {
      isValid: true,
      totalLogsVerified: logs.length,
      rootHash,
      message: `All ${logs.length} audit logs mathematically verified. Zero tampering detected.`,
      verifiedAt: new Date().toISOString()
    };
  }

  /**
   * Export audit trail data for regulatory compliance / grant auditors
   */
  async exportAuditLogs(ngoId, filters = {}) {
    const query = { ngoId };
    if (filters.action) query.action = filters.action;
    if (filters.resource) query.resource = filters.resource;
    if (filters.userId) query.userId = filters.userId;

    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(5000)
      .populate('userId', 'name email designation')
      .lean();

    return logs.map((l) => ({
      id: l._id,
      timestamp: l.createdAt,
      actorName: l.userId?.name || 'System / Platform Admin',
      actorEmail: l.userId?.email || 'system@ngocore.org',
      action: l.action,
      resource: l.resource || 'N/A',
      resourceId: l.resourceId || 'N/A',
      ip: l.ip || 'Unknown',
      userAgent: l.userAgent || 'Unknown',
      details: l.details ? JSON.stringify(l.details) : '',
      previousHash: l.previousHash || GENESIS_HASH,
      sha256Hash: l.hash || 'N/A'
    }));
  }
}

module.exports = new AuditService();
