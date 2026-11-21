import React, { useState, useEffect } from 'react';
import { X, Package, MapPin, AlertCircle } from 'lucide-react';
import inventoryService from './inventoryService';

const CATEGORIES = [
  { value: 'educational_materials', label: 'Educational Materials' },
  { value: 'food_rations', label: 'Food Rations & Relief Supplies' },
  { value: 'medical_kits', label: 'Medical Kits & Pharmaceuticals' },
  { value: 'clothing', label: 'Clothing & Blankets' },
  { value: 'electronics', label: 'Electronics & IT Equipment' },
  { value: 'furniture', label: 'Office & Facility Furniture' },
  { value: 'general', label: 'General NGO Assets' }
];

const UNITS = [
  { value: 'units', label: 'Units / Items' },
  { value: 'kits', label: 'Kits / Packs' },
  { value: 'boxes', label: 'Boxes' },
  { value: 'packets', label: 'Packets' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'liters', label: 'Liters' },
  { value: 'pieces', label: 'Pieces' },
  { value: 'meters', label: 'Meters' },
  { value: 'sets', label: 'Sets' }
];

export default function InventoryForm({ isOpen, onClose, item, onSaved, showNotification }) {
  const isEdit = Boolean(item);

  const [formData, setFormData] = useState({
    itemCode: '',
    name: '',
    category: 'general',
    initialQuantity: '0',
    unitOfMeasure: 'units',
    minThreshold: '5',
    unitCost: '0',
    building: '',
    room: '',
    shelf: '',
    description: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setFormData({
        itemCode: item.itemCode || '',
        name: item.name || '',
        category: item.category || 'general',
        initialQuantity: String(item.quantityOnHand || 0),
        unitOfMeasure: item.unitOfMeasure || 'units',
        minThreshold: String(item.minThreshold || 5),
        unitCost: String(item.unitCost || 0),
        building: item.storageLocation?.building || '',
        room: item.storageLocation?.room || '',
        shelf: item.storageLocation?.shelf || '',
        description: item.description || ''
      });
    } else {
      setFormData({
        itemCode: '',
        name: '',
        category: 'general',
        initialQuantity: '0',
        unitOfMeasure: 'units',
        minThreshold: '5',
        unitCost: '0',
        building: '',
        room: '',
        shelf: '',
        description: ''
      });
    }
    setError('');
  }, [item, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.name.trim()) {
      setError('Item name is required (min 2 characters).');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      unitOfMeasure: formData.unitOfMeasure,
      minThreshold: Number(formData.minThreshold) || 0,
      unitCost: Number(formData.unitCost) || 0,
      storageLocation: {
        building: formData.building.trim(),
        room: formData.room.trim(),
        shelf: formData.shelf.trim()
      },
      description: formData.description.trim()
    };

    if (!isEdit) {
      payload.initialQuantity = Number(formData.initialQuantity) || 0;
      if (formData.itemCode.trim()) {
        payload.itemCode = formData.itemCode.trim();
      }
    }

    setLoading(true);
    try {
      if (isEdit) {
        await inventoryService.updateInventoryItem(item._id, payload);
        showNotification('success', 'Inventory item updated successfully!');
      } else {
        await inventoryService.createInventoryItem(payload);
        showNotification('success', 'Inventory item cataloged successfully!');
      }
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save inventory item:', err);
      const errDetails = Array.isArray(err?.errors) ? err.errors.map(e => `${e.field ? e.field + ': ' : ''}${e.message}`).join('; ') : '';
      const msg = errDetails || err?.message || err?.response?.data?.message || 'Failed to save inventory item';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 to-orange-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-200" />
            <h2 className="text-lg font-bold">
              {isEdit ? `Edit Asset — ${item.itemCode}` : 'Catalog New Inventory Item'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Item / Asset Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Diagnostic Blood Glucose Test Kits"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {!isEdit && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Custom Item Code (Optional)
                </label>
                <input
                  type="text"
                  name="itemCode"
                  value={formData.itemCode}
                  onChange={handleChange}
                  placeholder="Auto-generated (INV-XXXX)"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Unit of Measure <span className="text-red-500">*</span>
              </label>
              <select
                name="unitOfMeasure"
                value={formData.unitOfMeasure}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>

            {!isEdit && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Initial Opening Stock
                </label>
                <input
                  type="number"
                  name="initialQuantity"
                  min="0"
                  step="any"
                  value={formData.initialQuantity}
                  onChange={handleChange}
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Low Stock Threshold Alert
              </label>
              <input
                type="number"
                name="minThreshold"
                min="0"
                step="any"
                value={formData.minThreshold}
                onChange={handleChange}
                placeholder="5"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Unit Cost (INR)
              </label>
              <input
                type="number"
                name="unitCost"
                min="0"
                step="0.01"
                value={formData.unitCost}
                onChange={handleChange}
                placeholder="₹ 0.00"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Storage Location */}
            <div className="sm:col-span-2 pt-2 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Storage & Warehouse Location
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <input
                    type="text"
                    name="building"
                    value={formData.building}
                    onChange={handleChange}
                    placeholder="Building / Warehouse"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="room"
                    value={formData.room}
                    onChange={handleChange}
                    placeholder="Room / Bay"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <input
                    type="text"
                    name="shelf"
                    value={formData.shelf}
                    onChange={handleChange}
                    placeholder="Shelf / Bin #"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Description / Specifications
              </label>
              <textarea
                name="description"
                rows="2"
                value={formData.description}
                onChange={handleChange}
                placeholder="Specifications, handling instructions, expiration notes..."
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Saving...' : isEdit ? 'Update Asset' : 'Catalog Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
