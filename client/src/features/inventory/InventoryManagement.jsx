import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Search,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  DollarSign,
  Layers,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import inventoryService from './inventoryService';
import InventoryTable from './InventoryTable';
import InventoryForm from './InventoryForm';
import InventoryDetails from './InventoryDetails';
import StockTransactionModal from './StockTransactionModal';

export default function InventoryManagement() {
  const { currentUser } = useAuth();
  const userRole = currentUser?.role || 'staff';
  const isAdmin = userRole === 'admin' || userRole === 'ngo_admin';
  const isStaff = userRole === 'staff';

  // Data state
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 1,
    page: 1,
    limit: 10
  });
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedTransactionItem, setSelectedTransactionItem] = useState(null);

  const [archiveModalOpen, setArchiveModalOpen] = useState(false);
  const [itemToArchive, setItemToArchive] = useState(null);

  const showNotification = useCallback((type, message) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((current) => (current?.message === message ? null : current));
    }, 4000);
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load summary
  const loadSummary = useCallback(async () => {
    try {
      const res = await inventoryService.getInventorySummary();
      const payload = res?.data || res;
      setSummary(payload?.data || payload || null);
    } catch (err) {
      console.error('Failed to load inventory summary:', err);
    }
  }, []);

  // Fetch items list
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        category: categoryFilter,
        lowStockOnly: lowStockOnly ? 'true' : undefined,
        search: debouncedSearch.trim() || undefined
      };
      const res = await inventoryService.getInventoryItems(params);
      const payload = res?.data || res;
      const dataObj = payload?.data || payload;
      setItems(dataObj?.items || (Array.isArray(dataObj) ? dataObj : []));
      setPagination(dataObj?.pagination || { total: 0, totalPages: 1, page: 1, limit: 10 });
    } catch (err) {
      console.error('Failed to fetch inventory items:', err);
      showNotification('error', 'Failed to load inventory assets.');
    } finally {
      setLoading(false);
    }
  }, [page, limit, categoryFilter, lowStockOnly, debouncedSearch, showNotification]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  // Handle open actions
  const handleOpenCreate = () => {
    setItemToEdit(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setItemToEdit(item);
    setIsFormOpen(true);
  };

  const handleOpenDetails = (id) => {
    setSelectedItemId(id);
    setIsDetailsOpen(true);
  };

  const handleOpenTransaction = (item) => {
    setSelectedTransactionItem(item);
    setIsTransactionModalOpen(true);
  };

  const handleOpenArchive = (id, name) => {
    setItemToArchive({ id, name });
    setArchiveModalOpen(true);
  };

  const handleArchiveConfirm = async () => {
    if (!itemToArchive) return;
    try {
      await inventoryService.deleteInventoryItem(itemToArchive.id);
      showNotification('success', `Asset "${itemToArchive.name}" archived successfully.`);
      setArchiveModalOpen(false);
      setItemToArchive(null);
      fetchItems();
      loadSummary();
    } catch (err) {
      console.error('Failed to archive asset:', err);
      showNotification('error', 'Failed to archive inventory asset.');
    }
  };

  const handleExportCsv = async () => {
    try {
      const res = await inventoryService.exportInventory({
        category: categoryFilter,
        lowStockOnly: lowStockOnly ? 'true' : undefined,
        search: debouncedSearch.trim() || undefined
      });
      const blob = res instanceof Blob ? res : new Blob([res?.data || res], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showNotification('success', 'Inventory catalog exported to CSV successfully.');
    } catch (err) {
      console.error('Failed to export inventory CSV:', err);
      showNotification('error', 'Failed to export inventory CSV.');
    }
  };

  return (
    <div className="feature-page-container" style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            marginBottom: 20,
            padding: '12px 18px',
            borderRadius: 8,
            backgroundColor: notification.type === 'error' ? 'var(--status-danger-bg)' : 'var(--status-success-bg)',
            color: notification.type === 'error' ? 'var(--status-danger)' : 'var(--status-success)',
            border: `1px solid ${notification.type === 'error' ? '#fecaca' : '#bbf7d0'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.875rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {notification.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            style={{ color: 'inherit', padding: 4, background: 'transparent', border: 'none', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                background: 'var(--brand-green-muted)',
                color: 'var(--brand-green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <Package size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Inventory &amp; Supplies
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Track equipment, relief supplies, medicines, food rations, and audit stock movements
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-outline"
            onClick={handleExportCsv}
            style={{
              padding: '9px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              fontWeight: 600,
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <Download size={16} />
            Export CSV
          </button>

          {(isAdmin || isStaff) && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
              style={{
                padding: '9px 18px',
                borderRadius: 8,
                background: 'var(--brand-green)',
                color: '#fff',
                fontWeight: 600,
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: 'var(--shadow-sm)',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Plus size={16} />
              Catalog Asset
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
          marginBottom: 24
        }}
      >
        {/* Total Assets */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Total Assets
            </span>
            <Package size={18} style={{ color: 'var(--brand-green)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: 4 }}>
            {summary?.totalItems ?? 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Cataloged item codes
          </div>
        </div>

        {/* Total Stock Units */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Stock Units
            </span>
            <Layers size={18} style={{ color: '#2563eb' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
            {summary?.totalQuantityOnHand ?? 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Units currently warehoused
          </div>
        </div>

        {/* Total Valuation */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Total Valuation
            </span>
            <DollarSign size={18} style={{ color: 'var(--status-success)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--status-success)', marginTop: 4 }}>
            ₹{Number(summary?.totalValuation ?? 0).toLocaleString()}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Inventory book asset value
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
              Low Stock Alerts
            </span>
            <AlertTriangle size={18} style={{ color: 'var(--status-danger)' }} />
          </div>
          <h3 style={{ fontSize: '1.6rem', fontWeight: 700, color: (summary?.lowStockCount ?? 0) > 0 ? 'var(--status-danger)' : 'var(--text-primary)', marginTop: 4 }}>
            {summary?.lowStockCount ?? 0}
          </h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Items at or below reorder threshold
          </div>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          padding: '16px 20px',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ flex: '1 1 260px', position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              placeholder="Search by name, item code, or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.875rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div style={{ minWidth: 180 }}>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.85rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="all">All Categories</option>
              <option value="equipment">Equipment &amp; Hardware</option>
              <option value="medical_supplies">Medical &amp; Healthcare</option>
              <option value="relief_kits">Relief &amp; Survival Kits</option>
              <option value="educational">Educational &amp; Learning Materials</option>
              <option value="stationery">Office Stationery &amp; Paper</option>
              <option value="food_rations">Food &amp; Nutrition Rations</option>
              <option value="furniture">Furniture &amp; Fixtures</option>
              <option value="clothing">Apparel &amp; Blankets</option>
              <option value="other">Other Asset Types</option>
            </select>
          </div>

          {/* Low Stock Toggle Button */}
          <div>
            <button
              type="button"
              onClick={() => {
                setLowStockOnly(!lowStockOnly);
                setPage(1);
              }}
              style={{
                padding: '9px 14px',
                borderRadius: 6,
                border: `1px solid ${lowStockOnly ? '#fecaca' : 'var(--border)'}`,
                background: lowStockOnly ? 'var(--status-danger-bg)' : 'var(--bg-surface)',
                color: lowStockOnly ? 'var(--status-danger)' : 'var(--text-secondary)',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer'
              }}
            >
              <AlertTriangle size={14} />
              <span>Low Stock Only</span>
            </button>
          </div>

          {/* Refresh button */}
          <button
            type="button"
            onClick={() => {
              fetchItems();
              loadSummary();
            }}
            disabled={loading}
            title="Refresh List"
            style={{
              padding: '9px 12px',
              borderRadius: 6,
              border: '1px solid var(--border)',
              background: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <InventoryTable
          items={items}
          isAdmin={isAdmin}
          isStaff={isStaff}
          onView={handleOpenDetails}
          onEdit={handleOpenEdit}
          onRecordTransaction={handleOpenTransaction}
          onDelete={handleOpenArchive}
        />

        {/* Pagination Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <span>
            Showing <strong>{items.length}</strong> of <strong>{pagination.total || 0}</strong> items (Page <strong>{pagination.page || 1}</strong> of <strong>{pagination.totalPages || 1}</strong>)
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
              style={{
                padding: '6px 10px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                fontSize: '0.8rem',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)'
              }}
            >
              <option value="10">10 per page</option>
              <option value="25">25 per page</option>
              <option value="50">50 per page</option>
            </select>

            <button
              type="button"
              className="btn btn-outline"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: pagination.page > 1 ? 1 : 0.4,
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                cursor: pagination.page > 1 ? 'pointer' : 'default'
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={pagination.page >= pagination.totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                opacity: pagination.page < pagination.totalPages ? 1 : 0.4,
                background: 'var(--bg-surface)',
                color: 'var(--text-secondary)',
                cursor: pagination.page < pagination.totalPages ? 'pointer' : 'default'
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <InventoryForm
        isOpen={isFormOpen}
        item={itemToEdit}
        onClose={() => setIsFormOpen(false)}
        onSaved={() => {
          fetchItems();
          loadSummary();
        }}
        showNotification={showNotification}
      />

      <InventoryDetails
        isOpen={isDetailsOpen}
        itemId={selectedItemId}
        onClose={() => setIsDetailsOpen(false)}
        onEdit={(item) => {
          setIsDetailsOpen(false);
          handleOpenEdit(item);
        }}
        onRecordTransaction={(item) => {
          setIsDetailsOpen(false);
          handleOpenTransaction(item);
        }}
        showNotification={showNotification}
      />

      <StockTransactionModal
        isOpen={isTransactionModalOpen}
        item={selectedTransactionItem}
        onClose={() => setIsTransactionModalOpen(false)}
        onUpdated={() => {
          fetchItems();
          loadSummary();
        }}
        showNotification={showNotification}
      />

      {/* Archive Modal */}
      {archiveModalOpen && itemToArchive && (
        <div className="modal-overlay" onClick={() => setArchiveModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: 24 }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
              Archive Inventory Asset
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 18 }}>
              Are you sure you want to archive "{itemToArchive.name}"? The item will be soft-deleted,
              preserving all historical stock movement records and valuation audit trails.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setArchiveModalOpen(false)}
                style={{ padding: '7px 14px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleArchiveConfirm}
                style={{
                  padding: '7px 16px',
                  borderRadius: 6,
                  background: 'var(--status-danger)',
                  color: '#fff',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Archive Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
