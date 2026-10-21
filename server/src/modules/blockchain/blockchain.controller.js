const blockchainService = require('./blockchain.service');
const { sendSuccess } = require('../../utils/response');

class BlockchainController {
  async anchorBatch(req, res, next) {
    try {
      const { batchType, limit } = req.body || {};
      const result = await blockchainService.anchorBatch(
        req.ngoId,
        { batchType, limit },
        req.user
      );
      return sendSuccess(res, 201, result.message, result);
    } catch (err) {
      next(err);
    }
  }

  async verifyLeaf(req, res, next) {
    try {
      const { leafHash, entityId } = req.body || {};
      const result = await blockchainService.verifyLeaf(req.ngoId, { leafHash, entityId });
      return sendSuccess(res, 200, 'Verification analysis completed', result);
    } catch (err) {
      next(err);
    }
  }

  async checkIntegrity(req, res, next) {
    try {
      const result = await blockchainService.checkIntegrity(req.ngoId);
      return sendSuccess(res, 200, 'Cryptographic database integrity report generated', result);
    } catch (err) {
      next(err);
    }
  }

  async getAnchors(req, res, next) {
    try {
      const { page, limit, batchType } = req.query || {};
      const result = await blockchainService.getAnchors(req.ngoId, { page, limit, batchType });
      return sendSuccess(res, 200, 'Blockchain anchor records retrieved', result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BlockchainController();
