import api from '../../services/api';

/**
 * Inventory & Asset Management API Service Client
 */
export const inventoryService = {
  /**
   * Fetch paginated inventory items with search, category filter, low-stock filter
   */
  getInventoryItems: async (params = {}) => {
    return await api.get('/inventory', { params });
  },

  /**
   * Fetch specific inventory item by ID with full transaction ledger & audit logs
   */
  getInventoryItemById: async (id) => {
    return await api.get(`/inventory/${id}`);
  },

  /**
   * Fetch inventory summary counts, valuation, and low stock items
   */
  getInventorySummary: async () => {
    return await api.get('/inventory/summary');
  },

  /**
   * Create a new inventory item
   */
  createInventoryItem: async (itemData) => {
    return await api.post('/inventory', itemData);
  },

  /**
   * Update inventory item details
   */
  updateInventoryItem: async (id, itemData) => {
    return await api.put(`/inventory/${id}`, itemData);
  },

  /**
   * Record a stock transaction (inflow, outflow, adjustment)
   */
  recordStockTransaction: async (id, transactionData) => {
    return await api.post(`/inventory/${id}/transactions`, transactionData);
  },

  /**
   * Archive / soft-delete inventory item (Admin only)
   */
  deleteInventoryItem: async (id) => {
    return await api.delete(`/inventory/${id}`);
  },

  /**
   * Export inventory catalog as CSV
   */
  exportInventory: async (params = {}) => {
    return await api.get('/inventory/export', {
      params,
      responseType: 'blob'
    });
  }
};

export default inventoryService;
