const auditService = require('./audit.service');
const { sendSuccess } = require('../../utils/response');

const getAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.getAuditLogs(req.scopedNgoId, req.query);
    sendSuccess(res, 200, 'Audit logs retrieved successfully', result.logs, null, {
      pagination: result.pagination,
      actionStats: result.actionStats,
      currentRootHash: result.currentRootHash
    });
  } catch (error) {
    next(error);
  }
};

const verifyChainIntegrity = async (req, res, next) => {
  try {
    const result = await auditService.verifyChainIntegrity(req.scopedNgoId);
    sendSuccess(res, 200, 'Cryptographic chain verification completed', result);
  } catch (error) {
    next(error);
  }
};

const exportAuditLogs = async (req, res, next) => {
  try {
    const format = req.query.format || 'json';
    const exportedData = await auditService.exportAuditLogs(req.scopedNgoId, req.query);

    if (format === 'csv') {
      const headers = [
        'Timestamp',
        'Actor Name',
        'Actor Email',
        'Action',
        'Resource',
        'Resource ID',
        'IP Address',
        'User Agent',
        'Details',
        'Previous Hash',
        'SHA256 Hash'
      ];

      const csvRows = [
        headers.join(','),
        ...exportedData.map(row => [
          `"${new Date(row.timestamp).toISOString()}"`,
          `"${(row.actorName || '').replace(/"/g, '""')}"`,
          `"${(row.actorEmail || '').replace(/"/g, '""')}"`,
          `"${row.action}"`,
          `"${row.resource}"`,
          `"${row.resourceId}"`,
          `"${row.ip}"`,
          `"${(row.userAgent || '').replace(/"/g, '""')}"`,
          `"${(row.details || '').replace(/"/g, '""')}"`,
          `"${row.previousHash}"`,
          `"${row.sha256Hash}"`
        ].join(','))
      ];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="audit_trail_${Date.now()}.csv"`);
      return res.status(200).send(csvRows.join('\n'));
    }

    sendSuccess(res, 200, 'Audit logs exported successfully', exportedData);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAuditLogs,
  verifyChainIntegrity,
  exportAuditLogs
};
