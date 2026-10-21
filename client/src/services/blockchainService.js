import api from './api';

export const blockchainService = {
  /**
   * Anchor a batch of audit logs, records, or files to Polygon L2
   */
  async anchorBatch(payload = {}) {
    const res = await api.post('/blockchain/anchor', payload);
    return res.data?.data;
  },

  /**
   * Verify individual leaf inclusion in on-chain Merkle tree
   */
  async verifyLeaf(payload) {
    const res = await api.post('/blockchain/verify-leaf', payload);
    return res.data?.data;
  },

  /**
   * Run cryptographic database tamper check against anchored Merkle roots
   */
  async checkIntegrity() {
    const res = await api.get('/blockchain/integrity');
    return res.data?.data;
  },

  /**
   * Get paginated list of blockchain anchors for current NGO
   */
  async getAnchors(params = {}) {
    const res = await api.get('/blockchain/anchors', { params });
    return res.data?.data || { anchors: [], pagination: {} };
  }
};
