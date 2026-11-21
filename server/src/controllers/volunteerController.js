const volunteerService = require('../services/volunteerService');
const {
  createVolunteerSchema,
  updateVolunteerSchema,
  logHoursSchema,
  reviewHoursSchema,
  volunteerQuerySchema
} = require('../validations/volunteerValidation');

const createVolunteer = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = createVolunteerSchema.parse(req.body);
    const volunteer = await volunteerService.createVolunteer(validatedData, ngoId, req.user);
    res.status(201).json({
      success: true,
      message: 'Volunteer registered successfully.',
      data: { volunteer }
    });
  } catch (err) {
    next(err);
  }
};

const getVolunteers = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedQuery = volunteerQuerySchema.parse(req.query);
    const result = await volunteerService.getVolunteers(validatedQuery, ngoId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getVolunteerById = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const result = await volunteerService.getVolunteerById(req.params.id, ngoId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const updateVolunteer = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = updateVolunteerSchema.parse(req.body);
    const volunteer = await volunteerService.updateVolunteer(req.params.id, validatedData, ngoId, req.user);
    res.status(200).json({
      success: true,
      message: 'Volunteer updated successfully.',
      data: { volunteer }
    });
  } catch (err) {
    next(err);
  }
};

const logHours = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = logHoursSchema.parse(req.body);
    const volunteer = await volunteerService.logHours(req.params.id, validatedData, ngoId, req.user);
    res.status(201).json({
      success: true,
      message: 'Volunteer hours logged successfully.',
      data: { volunteer }
    });
  } catch (err) {
    next(err);
  }
};

const reviewHours = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = reviewHoursSchema.parse(req.body);
    const volunteer = await volunteerService.reviewHours(
      req.params.id,
      req.params.logId,
      validatedData,
      ngoId,
      req.user
    );
    res.status(200).json({
      success: true,
      message: `Volunteer hours ${validatedData.status} successfully.`,
      data: { volunteer }
    });
  } catch (err) {
    next(err);
  }
};

const getVolunteerSummary = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const summary = await volunteerService.getVolunteerSummary(ngoId);
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
};

const deleteVolunteer = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const result = await volunteerService.deleteVolunteer(req.params.id, ngoId, req.user);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
};

const exportVolunteers = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedQuery = volunteerQuerySchema.parse(req.query);
    const csvContent = await volunteerService.exportVolunteersCsv(validatedQuery, ngoId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="volunteers_export_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createVolunteer,
  getVolunteers,
  getVolunteerById,
  updateVolunteer,
  logHours,
  reviewHours,
  getVolunteerSummary,
  deleteVolunteer,
  exportVolunteers
};
