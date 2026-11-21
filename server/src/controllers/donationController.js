const donationService = require('../services/donationService');
const { successResponse } = require('../utils/apiResponse');
const { writeAuditLog } = require('../services/auditService');
const Ngo = require('../models/Ngo');

/**
 * @desc    Get all donations with pagination, search, and multi-filters
 * @route   GET /api/v1/donations
 * @access  Admin, Staff
 */
const listDonations = async (req, res, next) => {
  try {
    const result = await donationService.listDonations(req.query, req.ngoFilter);
    return successResponse(res, 200, 'Donations retrieved successfully', {
      donations: result.donations,
      pagination: result.pagination
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get donation summary and KPI analytics
 * @route   GET /api/v1/donations/summary
 * @access  Admin, Staff
 */
const getDonationSummary = async (req, res, next) => {
  try {
    const summary = await donationService.getDonationSummary(req.ngoFilter);
    return successResponse(res, 200, 'Donation summary retrieved successfully', { summary });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export donation records to CSV / Excel / PDF
 * @route   GET /api/v1/donations/export
 * @access  Admin, Staff
 */
const exportDonations = async (req, res, next) => {
  try {
    const ngo = await Ngo.findById(req.user.ngoId).select('name').lean();
    const ngoName = ngo?.name || 'NGO Organization';
    const format = (req.query.format || 'csv').toLowerCase();

    const result = await donationService.exportDonations(req.query, format, req.ngoFilter, ngoName);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);

    if (result.buffer) {
      return res.send(result.buffer);
    }
    return res.send(result.content);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get donation details by ID
 * @route   GET /api/v1/donations/:id
 * @access  Admin, Staff
 */
const getDonationById = async (req, res, next) => {
  try {
    const result = await donationService.getDonationById(req.params.id, req.ngoFilter);
    return successResponse(res, 200, 'Donation retrieved successfully', {
      donation: result.donation,
      auditLogs: result.auditLogs
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a new donation
 * @route   POST /api/v1/donations
 * @access  Admin, Staff
 */
const createDonation = async (req, res, next) => {
  try {
    const donation = await donationService.createDonation(req.body, req.user, req.user.ngoId, req.ngoFilter);

    await writeAuditLog({
      req,
      action: 'create',
      entityType: 'donation',
      entityId: donation._id,
      metadata: {
        donationNumber: donation.donationNumber,
        amount: donation.amount,
        currency: donation.currency,
        paymentMethod: donation.paymentMethod,
        donorName: donation.donorSnapshot.name,
        donorId: donation.donorId
      }
    });

    return successResponse(res, 201, 'Donation recorded successfully', { donation });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update permitted fields on a donation
 * @route   PUT /api/v1/donations/:id
 * @access  Admin, Staff
 */
const updateDonation = async (req, res, next) => {
  try {
    const { donation, modifiedFields } = await donationService.updateDonation(
      req.params.id,
      req.body,
      req.user,
      req.ngoFilter
    );

    if (modifiedFields.length > 0) {
      await writeAuditLog({
        req,
        action: 'update',
        entityType: 'donation',
        entityId: donation._id,
        metadata: { modifiedFields }
      });
    }

    return successResponse(res, 200, 'Donation updated successfully', { donation });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify a donation
 * @route   PATCH /api/v1/donations/:id/verify
 * @access  Admin, Staff
 */
const verifyDonation = async (req, res, next) => {
  try {
    const donation = await donationService.verifyDonation(req.params.id, req.user, req.ngoFilter);

    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'donation',
      entityId: donation._id,
      metadata: { newStatus: 'verified', verifiedBy: req.user.email }
    });

    return successResponse(res, 200, 'Donation verified successfully', { donation });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve a donation (enforces separation of duties)
 * @route   PATCH /api/v1/donations/:id/approve
 * @access  Admin, Staff
 */
const approveDonation = async (req, res, next) => {
  try {
    const donation = await donationService.approveDonation(req.params.id, req.user, req.ngoFilter);

    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'donation',
      entityId: donation._id,
      metadata: { newStatus: 'approved', approvedBy: req.user.email }
    });

    return successResponse(res, 200, 'Donation approved successfully', { donation });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reverse or cancel a donation
 * @route   POST /api/v1/donations/:id/reverse
 * @access  Admin, Staff (reversing approved is Admin only)
 */
const reverseDonation = async (req, res, next) => {
  try {
    const { donation, previousStatus, newStatus } = await donationService.reverseDonation(
      req.params.id,
      req.body.reason,
      req.user,
      req.ngoFilter
    );

    await writeAuditLog({
      req,
      action: 'update',
      entityType: 'donation',
      entityId: donation._id,
      metadata: {
        actionType: 'reversal',
        previousStatus,
        newStatus,
        reason: donation.reversalReason,
        reversedBy: req.user.email
      }
    });

    return successResponse(res, 200, `Donation successfully marked as ${newStatus}`, { donation });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Issue official receipt (state-mutating)
 * @route   POST /api/v1/donations/:id/receipt
 * @access  Admin, Staff
 */
const issueReceipt = async (req, res, next) => {
  try {
    const result = await donationService.issueReceipt(req.params.id, req.user, req.ngoFilter);

    if (!result.isExisting) {
      await writeAuditLog({
        req,
        action: 'create',
        entityType: 'donation',
        entityId: result.donation._id,
        metadata: {
          receiptNumber: result.receiptNumber,
          issuedAt: result.issuedAt,
          issuedBy: req.user.email
        }
      });
    }

    const statusCode = result.isExisting ? 200 : 201;
    const message = result.isExisting
      ? 'Existing receipt retrieved successfully'
      : 'Receipt issued successfully';

    return successResponse(res, statusCode, message, {
      receiptNumber: result.receiptNumber,
      issuedAt: result.issuedAt,
      isExisting: result.isExisting,
      donation: result.donation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get existing receipt metadata (strictly read-only)
 * @route   GET /api/v1/donations/:id/receipt
 * @access  Admin, Staff
 */
const getReceiptMetadata = async (req, res, next) => {
  try {
    const result = await donationService.getReceiptMetadata(req.params.id, req.ngoFilter);

    return successResponse(res, 200, 'Receipt metadata retrieved successfully', {
      receiptNumber: result.receiptNumber,
      issuedAt: result.issuedAt,
      issuedBy: result.issuedBy,
      donation: result.donation
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Download official receipt as PDF (strictly read-only)
 * @route   GET /api/v1/donations/:id/receipt/pdf
 * @access  Admin, Staff
 */
const downloadReceiptPdf = async (req, res, next) => {
  try {
    const pdfBuffer = await donationService.generateReceiptPdfBuffer(req.params.id, req.ngoFilter);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="receipt-${req.params.id}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  listDonations,
  getDonationSummary,
  exportDonations,
  getDonationById,
  createDonation,
  updateDonation,
  verifyDonation,
  approveDonation,
  reverseDonation,
  issueReceipt,
  getReceiptMetadata,
  downloadReceiptPdf
};
