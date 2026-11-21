const inventoryService = require('../services/inventoryService');
const {
  createInventoryItemSchema,
  updateInventoryItemSchema,
  stockTransactionSchema,
  inventoryQuerySchema
} = require('../validations/inventoryValidation');

const createItem = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = createInventoryItemSchema.parse(req.body);
    const item = await inventoryService.createInventoryItem(validatedData, ngoId, req.user);
    res.status(201).json({
      success: true,
      message: 'Inventory item created successfully.',
      data: { item }
    });
  } catch (err) {
    next(err);
  }
};

const recordTransaction = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = stockTransactionSchema.parse(req.body);
    const result = await inventoryService.recordStockTransaction(
      req.params.id,
      validatedData,
      ngoId,
      req.user
    );
    res.status(200).json({
      success: true,
      message: `Stock ${validatedData.type} transaction recorded successfully.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getInventoryItems = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedQuery = inventoryQuerySchema.parse(req.query);
    const result = await inventoryService.getInventoryItems(validatedQuery, ngoId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const getInventoryItemById = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const result = await inventoryService.getInventoryItemById(req.params.id, ngoId);
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

const updateInventoryItem = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedData = updateInventoryItemSchema.parse(req.body);
    const item = await inventoryService.updateInventoryItem(req.params.id, validatedData, ngoId, req.user);
    res.status(200).json({
      success: true,
      message: 'Inventory item updated successfully.',
      data: { item }
    });
  } catch (err) {
    next(err);
  }
};

const getInventorySummary = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const summary = await inventoryService.getInventorySummary(ngoId);
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    next(err);
  }
};

const deleteInventoryItem = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const result = await inventoryService.deleteInventoryItem(req.params.id, ngoId, req.user);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    next(err);
  }
};

const exportInventory = async (req, res, next) => {
  try {
    const ngoId = req.ngoId || req.user?.ngoId;
    const validatedQuery = inventoryQuerySchema.parse(req.query);
    const csvContent = await inventoryService.exportInventoryCsv(validatedQuery, ngoId);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="inventory_export_${new Date().toISOString().slice(0, 10)}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createItem,
  recordTransaction,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  getInventorySummary,
  deleteInventoryItem,
  exportInventory
};
