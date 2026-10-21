import api from './api';

export const privacyService = {
  /**
   * Record or update consent for a beneficiary record
   */
  async grantConsent({ recordId, purpose, proofType, witnessName, validUntil }) {
    const res = await api.post('/privacy/consent', {
      recordId,
      purpose,
      proofType,
      witnessName,
      validUntil
    });
    return res.data?.data;
  },

  /**
   * Withdraw consent
   */
  async withdrawConsent(consentId, reason = '') {
    const res = await api.patch(`/privacy/consent/${consentId}/withdraw`, { reason });
    return res.data?.data;
  },

  /**
   * Fetch all consents for a record
   */
  async getConsents(recordId) {
    const res = await api.get(`/privacy/consent/${recordId}`);
    return res.data?.data || [];
  },

  /**
   * Execute DPDP Right to be Forgotten
   */
  async executeRightToBeForgotten({ recordId, requestedBy, reason }) {
    const res = await api.post('/privacy/erasure', {
      recordId,
      requestedBy,
      reason
    });
    return res.data?.data;
  },

  /**
   * Export Subject Access Request (SAR) package
   */
  async exportSAR(recordId) {
    const res = await api.get(`/privacy/sar/${recordId}`);
    return res.data?.data;
  }
};

export default privacyService;
