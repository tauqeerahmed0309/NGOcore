const ngoService = require('./ngo.service');
const { sendSuccess } = require('../../utils/response');

const onboardNgo = async (req, res, next) => {
  try {
    const documents = req.files ? req.files.map(f => ({ url: f.path, originalName: f.originalname, publicId: f.filename })) : [];
    const data = await ngoService.onboardNgo(req.user.ngoId, req.body, documents, req.user.userId || req.user._id);
    sendSuccess(res, 200, 'Onboarding completed. Pending platform admin approval.', data);
  } catch (error) {
    next(error);
  }
};

const getNgoProfile = async (req, res, next) => {
  try {
    const ngoId = req.scopedNgoId || req.user?.ngoId;
    const profile = await ngoService.getNgoProfile(ngoId);
    sendSuccess(res, 200, 'Organization profile retrieved successfully', profile);
  } catch (error) {
    next(error);
  }
};

const updateNgoProfile = async (req, res, next) => {
  try {
    const ngoId = req.scopedNgoId || req.user?.ngoId;
    const userId = req.user?.userId || req.user?._id;
    const logoFile = req.file;
    const meta = {
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    };

    const updatedNgo = await ngoService.updateNgoProfile(ngoId, req.body, logoFile, userId, meta);
    sendSuccess(res, 200, 'Organization profile updated successfully', updatedNgo);
  } catch (error) {
    next(error);
  }
};

const updateNgoSettings = async (req, res, next) => {
  try {
    const ngoId = req.scopedNgoId || req.user?.ngoId;
    const userId = req.user?.userId || req.user?._id;
    const meta = {
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.headers['user-agent']
    };

    const updatedSettings = await ngoService.updateNgoSettings(ngoId, req.body, userId, meta);
    sendSuccess(res, 200, 'Organization settings updated successfully', updatedSettings);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  onboardNgo,
  getNgoProfile,
  updateNgoProfile,
  updateNgoSettings
};
