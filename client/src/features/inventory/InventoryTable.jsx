import React from 'react';
import {
  Package,
  Eye,
  Edit2,
  Trash2,
  PlusCircle,
  AlertTriangle
} from 'lucide-react';

export default function InventoryTable({
  items,
  isAdmin,
  isStaff,
  onView,
  onEdit,
  onRecordTransaction,
  onDelete
}) {
  if (!items || items.length === 0) {
    return (
      <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Package size={36} style={{ margin: '0 auto 12px auto', opacity: 0.5 }} />
        <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
          No Inventory Items Found
        </h4>
        <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto' }}>
          No assets or inventory items match your search criteria, or no catalog items exist yet.
        </p>
      </div>
    );
  }

  return (
    <div className="table-responsive" style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
            <th style={{ padding: '12px 16px', fontWeight: 600, width: '130px' }}>Item Code</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Asset Name &amp; Category</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Stock on Hand</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Valuation (INR)</th>
            <th style={{ padding: '12px 16px', fontWeight: 600 }}>Storage Location</th>
            <th style={{ padding: '12px 16px', fontWeight: 600, textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const currentStock = item.quantityOnHand || 0;
            const minThreshold = item.minThreshold || 0;
            const isOutOfStock = currentStock === 0;
            const isLowStock = currentStock > 0 && currentStock <= minThreshold;
            const valuation = currentStock * (item.unitCost || 0);

            return (
              <tr
                key={item._id}
                style={{
                  borderBottom: '1px solid var(--border)',
                  transition: 'background-color 150ms'
                }}
                className="table-row-hover"
              >
                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <button
                    type="button"
                    onClick={() => onView(item._id)}
                    style={{
                      fontFamily: 'monospace',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      padding: '2px 6px',
                      borderRadius: 4,
                      backgroundColor: '#f1f5f9',
                      color: 'var(--brand-green)',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {item.itemCode}
                  </button>
                </td>

                <td style={{ padding: '14px 16px', maxWidth: '240px' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', textTransform: 'capitalize', marginTop: 2 }}>
                    {item.category?.replace('_', ' ')}
                  </div>
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {currentStock}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {item.unitOfMeasure}
                    </span>

                    {isOutOfStock && (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          backgroundColor: 'var(--status-danger-bg)',
                          color: 'var(--status-danger)',
                          border: '1px solid #fecaca'
                        }}
                      >
                        Out of Stock
                      </span>
                    )}

                    {isLowStock && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: '0.7rem',
                          fontWeight: 600,
                          backgroundColor: 'var(--status-warning-bg)',
                          color: 'var(--status-warning)',
                          border: '1px solid #fde68a'
                        }}
                      >
                        <AlertTriangle size={11} /> Low Stock
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    Min threshold: {minThreshold} {item.unitOfMeasure}
                  </div>
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    ₹{valuation.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                    @ ₹{item.unitCost || 0} / {item.unitOfMeasure}
                  </div>
                </td>

                <td style={{ padding: '14px 16px', maxWidth: '200px' }}>
                  <div style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.storageLocation?.building || 'Unassigned'}
                  </div>
                  {(item.storageLocation?.room || item.storageLocation?.shelf) && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {[item.storageLocation.room, item.storageLocation.shelf].filter(Boolean).join(' • ')}
                    </div>
                  )}
                </td>

                <td style={{ padding: '14px 16px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => onView(item._id)}
                      title="View Asset Details & Ledger"
                      style={{
                        padding: '6px',
                        borderRadius: 4,
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        background: 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <Eye size={15} />
                    </button>

                    {(isAdmin || isStaff) && (
                      <button
                        type="button"
                        onClick={() => onRecordTransaction(item)}
                        title="Record Stock Movement (In/Out/Audit)"
                        style={{
                          padding: '6px',
                          borderRadius: 4,
                          border: '1px solid #bbf7d0',
                          color: 'var(--status-success)',
                          background: 'var(--status-success-bg)',
                          cursor: 'pointer'
                        }}
                      >
                        <PlusCircle size={15} />
                      </button>
                    )}

                    {(isAdmin || isStaff) && (
                      <button
                        type="button"
                        onClick={() => onEdit(item)}
                        title="Edit Asset Parameters"
                        style={{
                          padding: '6px',
                          borderRadius: 4,
                          border: '1px solid var(--border)',
                          color: 'var(--brand-green)',
                          background: 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <Edit2 size={15} />
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => onDelete(item._id, item.name)}
                        title="Archive Asset"
                        style={{
                          padding: '6px',
                          borderRadius: 4,
                          border: '1px solid #fecaca',
                          color: 'var(--status-danger)',
                          background: 'transparent',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
