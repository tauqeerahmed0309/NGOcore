const donorService = require('../services/donorService');
const { successResponse } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/auditService');

/**
 * @desc    Get all donors with search, filtering, sorting, and pagination
 * @route   GET /api/v1/donors
 * @access  Admin, Staff
 */
const listDonors = async (req, res, next) => {
  try {
    const result = await donorService.listDonors(req.query, req.ngoFilter);
    return successResponse(res, 200, 'Donors retrieved successfully', {
      donors: result.donors,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get donor profile by ID
 * @route   GET /api/v1/donors/:id
 * @access  Admin, Staff
 */
const getDonorById = async (req, res, next) => {
  try {
    const result = await donorService.getDonorById(req.params.id, req.ngoFilter);
    return successResponse(res, 200, 'Donor retrieved successfully', {
      donor: result.donor,
      auditLogs: result.auditLogs,
      donations: result.donations || []
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new donor profile
 * @route   POST /api/v1/donors
 * @access  Admin, Staff
 */
const createDonor = async (req, res, next) => {
  try {
    const donor = await donorService.createDonor(req.body, req.user._id, req.user.ngoId, req.ngoFilter);
    await writeAuditLog({
      req,
      action: 'create',
      entityType: 'donor',
      entityId: donor._id,
      metadata: {
        donorNumber: donor.donorNumber,
        name: donor.name,
        type: donor.type,
        category: donor.category
      }
    });
    return successResponse(res, 201, 'Donor created successfully', { donor });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update donor details
 * @route   PUT /api/v1/donors/:id
 * @access  Admin, Staff
 */
const updateDonor = async (req, res, next) => {
  try {
    const { donor, modifiedFields } = await donorService.updateDonor(req.params.id, req.body, req.ngoFilter);
    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'donor',
      entityId: donor._id,
      metadata: { modifiedFields }
    });
    return successResponse(res, 200, 'Donor updated successfully', { donor });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update donor status (active, inactive, archived)
 * @route   PATCH /api/v1/donors/:id/status
 * @access  Admin, Staff
 */
const updateDonorStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const donor = await donorService.updateDonorStatus(req.params.id, status, req.ngoFilter);
    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'donor',
      entityId: donor._id,
      metadata: { field: 'status', value: status }
    });
    return successResponse(res, 200, `Donor status updated to '${status}' successfully`, { donor });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Safely delete donor record (only if no audit history or linked records exist)
 * @route   DELETE /api/v1/donors/:id
 * @access  Admin
 */
const deleteDonor = async (req, res, next) => {
  try {
    const result = await donorService.deleteDonor(req.params.id, req.ngoFilter);
    await writeAuditLog({
      req,
      action: 'delete',
      entityType: 'donor',
      entityId: req.params.id
    });
    return successResponse(res, 200, result.message, { donorId: result.donorId });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDonors,
  getDonorById,
  createDonor,
  updateDonor,
  updateDonorStatus,
  deleteDonor
};
