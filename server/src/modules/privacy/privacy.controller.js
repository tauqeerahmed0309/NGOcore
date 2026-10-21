const privacyService = require('./privacy.service');
const { sendSuccess } = require('../../utils/response');

class PrivacyController {
  async grantConsent(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const consent = await privacyService.grantConsent(
        req.ngoId,
        req.body,
        req.user,
        ip,
        userAgent
      );
      return sendSuccess(res, 201, 'Consent recorded successfully', consent);
    } catch (err) {
      next(err);
    }
  }

  async withdrawConsent(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const consent = await privacyService.withdrawConsent(
        req.ngoId,
        req.params.id,
        req.body,
        req.user,
        ip,
        userAgent
      );
      return sendSuccess(res, 200, 'Consent withdrawn successfully', consent);
    } catch (err) {
      next(err);
    }
  }

  async getConsentsByRecord(req, res, next) {
    try {
      const consents = await privacyService.getConsentsByRecord(req.ngoId, req.params.recordId);
      return sendSuccess(res, 200, 'Consents retrieved', consents);
    } catch (err) {
      next(err);
    }
  }

  async executeRightToBeForgotten(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const result = await privacyService.executeRightToBeForgotten(
        req.ngoId,
        req.body,
        req.user,
        ip,
        userAgent
      );
      return sendSuccess(res, 200, 'Right to be Forgotten executed and certificate generated', result);
    } catch (err) {
      next(err);
    }
  }

  async exportSubjectAccessData(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const sarPackage = await privacyService.exportSubjectAccessData(
        req.ngoId,
        req.params.recordId,
        req.user,
        ip,
        userAgent
      );
      return sendSuccess(res, 200, 'Subject access data package exported', sarPackage);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new PrivacyController();
