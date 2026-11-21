const documentService = require('../services/documentService');
const {
  createDocumentSchema,
  updateDocumentSchema,
  verifyDocumentSchema,
  documentQuerySchema
} = require('../validations/documentValidation');

const createDocument = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = createDocumentSchema.parse(req.body);
    const document = await documentService.createDocument(validatedData, ngoId, req.user);
    res.status(201).json({
      success: true,
      message: 'Document record created successfully.',
      data: { document }
    });
  } catch (err) {
    next(err);
  }
};

const verifyDocument = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = verifyDocumentSchema.parse(req.body);
    const document = await documentService.verifyDocument(
      req.params.id,
      validatedData,
      ngoId,
      req.user
    );
    res.status(200).json({
      success: true,
      message: `Document status verified to ${validatedData.status}.`,
      data: { document }
    });
  } catch (err) {
    next(err);
  }
};

const getDocuments = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedQuery = documentQuerySchema.parse(req.query);
    const result = await documentService.getDocuments(validatedQuery, ngoId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getDocumentById = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const result = await documentService.getDocumentById(req.params.id, ngoId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const updateDocument = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = updateDocumentSchema.parse(req.body);
    const document = await documentService.updateDocument(
      req.params.id,
      validatedData,
      ngoId,
      req.user
    );
    res.status(200).json({
      success: true,
      message: 'Document record updated successfully.',
      data: { document }
    });
  } catch (err) {
    next(err);
  }
};

const getDocumentSummary = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const summary = await documentService.getDocumentSummary(ngoId);
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const result = await documentService.deleteDocument(req.params.id, ngoId, req.user);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
};

const exportDocuments = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedQuery = documentQuerySchema.parse(req.query);
    const csvContent = await documentService.exportDocumentsCsv(validatedQuery, ngoId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="documents_export_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createDocument,
  verifyDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  getDocumentSummary,
  deleteDocument,
  exportDocuments
};
