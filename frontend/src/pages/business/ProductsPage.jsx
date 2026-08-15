import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Package,
  AlertCircle,
  Eye,
  History,
  DollarSign,
  Tag,
  Barcode,
  Box,
} from 'lucide-react';
import { categoriesApi, productsApi } from '../../api/index.js';
import PageContainer from '../../layouts/PageContainer.jsx';
import { useThemeContext } from '../../context/ThemeContext.jsx';
import ExcelImportActions from '../../components/common/ExcelImportActions.jsx';
import { productImport } from '../../utils/importTemplates.js';

// ---------- Helper Components ----------
function StatusBadge({ status, stockStatus }) {
  if (stockStatus) {
    const map = {
      in_stock: { label: 'In Stock', color: 'emerald' },
      low_stock: { label: 'Low Stock', color: 'yellow' },
      out_of_stock: { label: 'Out of Stock', color: 'rose' },
    };
    const { label, color } = map[stockStatus] || { label: stockStatus, color: 'gray' };
    const colorClasses = {
      emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      yellow: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
      rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      gray: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClasses[color]}`}>
        <span className={`h-1.5 w-1.5 rounded-full bg-${color}-500`} />
        {label}
      </span>
    );
  }
  // status (active/inactive)
  const isActive = status === 'active';
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isActive
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );
}

function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal Container - centered */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <motion.div
          className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-6 shadow-2xl backdrop-blur-2xl sm:p-8 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Drawer({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer Container - centered */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <motion.div
          className="w-[min(92vw,52rem)] max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel-strong)] p-6 shadow-2xl backdrop-blur-2xl sm:p-8 pointer-events-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between">
            <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-6">{children}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ---------- Main Component ----------
export function ProductsPage() {
  const { darkMode, getBrandPrimary, getBrandSecondary } = useThemeContext();
  const primaryColor = getBrandPrimary?.() || '#064789';
  const secondaryColor = getBrandSecondary?.() || '#427aa1';

  // State
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modal/Drawer states
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    productName: '',
    sku: '',
    barcode: '',
    unit: '',
    description: '',
    buyingPrice: '',
    sellingPrice: '',
    initialStockQuantity: '',
    minimumStock: '',
    categoryId: '',
    imageUrl: '',
  });

  // ---------- Data fetching ----------
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: pageSize,
        search: search || undefined,
        lowStock: lowStockFilter || undefined,
      };
      Object.keys(params).forEach((key) => {
        if (params[key] === undefined || params[key] === '') delete params[key];
      });
      const data = await productsApi.list(params);
      setProducts(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err?.message || 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, lowStockFilter]);

  const fetchCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.list({ limit: 100 });
      setCategories(data.items || []);
    } catch {
      setCategories([]);
    }
  }, []);

  const refreshAll = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, lowStockFilter]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ---------- Pagination ----------
  const totalPages = Math.ceil(total / pageSize);
  const startIndex = (page - 1) * pageSize;

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const goToPage = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  // ---------- Modal handlers ----------
  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      productName: '',
      sku: '',
      barcode: '',
      unit: '',
      description: '',
      buyingPrice: '',
      sellingPrice: '',
      initialStockQuantity: '',
      minimumStock: '',
      categoryId: '',
      imageUrl: '',
    });
    setProductModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      productName: product.productName || '',
      sku: product.sku || '',
      barcode: product.barcode || '',
      unit: product.unit || '',
      description: product.description || '',
      buyingPrice: product.buyingPrice || '',
      sellingPrice: product.sellingPrice || '',
      initialStockQuantity: '', // not used for edit
      minimumStock: product.minimumStock || '',
      categoryId: product.categoryId || '',
      imageUrl: product.imageUrl || '',
    });
    setProductModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ---------- CRUD actions ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        productName: formData.productName,
        sku: formData.sku,
        barcode: formData.barcode,
        unit: formData.unit,
        description: formData.description,
        buyingPrice: parseFloat(formData.buyingPrice) || 0,
        sellingPrice: parseFloat(formData.sellingPrice) || 0,
        minimumStock: parseInt(formData.minimumStock) || 0,
        categoryId: formData.categoryId || undefined,
        imageUrl: formData.imageUrl || undefined,
      };
      if (editingProduct) {
        // For update, we cannot send initialStockQuantity
        await productsApi.update(editingProduct.id, payload);
      } else {
        payload.initialStockQuantity = parseInt(formData.initialStockQuantity) || 0;
        await productsApi.create(payload);
      }
      setProductModalOpen(false);
      await fetchProducts();
    } catch (err) {
      alert('Failed to save product: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to archive this product?')) return;
    try {
      await productsApi.remove(id);
      await fetchProducts();
    } catch (err) {
      alert('Failed to delete product: ' + err.message);
    }
  };

  const handleViewHistory = async (id) => {
    setHistoryDrawerOpen(true);
    setHistoryLoading(true);
    try {
      const data = await productsApi.history(id);
      setHistoryData(data);
    } catch (err) {
      alert('Failed to load product history: ' + err.message);
      setHistoryDrawerOpen(false);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ---------- Render ----------
  return (
    <PageContainer
      title="Products"
      subtitle="Manage product records, pricing, stock tracking, and catalog details."
      actions={
        <div className="flex flex-wrap gap-2">
          <ExcelImportActions
            entityName="Products"
            fileName="INVEXA_Products_Import_Template.xlsx"
            columns={productImport.columns}
            mapRow={(row) => productImport.mapRow(row, categories)}
            createRecord={productsApi.create}
            onImported={fetchProducts}
          />
          <button
            type="button"
            onClick={refreshAll}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>
      }
    >
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] pl-9 pr-4 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-tertiary)] focus:border-[var(--brand-primary)] focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <input
              type="checkbox"
              checked={lowStockFilter}
              onChange={(e) => setLowStockFilter(e.target.checked)}
              className="h-4 w-4 rounded border-[var(--color-panel-border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
            />
            Low Stock Only
          </label>
        </div>
        <div className="text-sm text-[var(--color-text-secondary)]">
          Total: {total} product{total !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Table */}
      {error ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={fetchProducts}
            className="mt-4 rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-[var(--color-panel-border)] text-[var(--color-text-secondary)]">
                <tr>
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">SKU</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Price</th>
                  <th className="px-4 py-3 font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Min</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i} className="border-b border-[var(--color-panel-border)] last:border-0">
                      <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-20 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-12 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                      <td className="px-4 py-3"><div className="ml-auto h-4 w-16 animate-pulse rounded bg-[var(--color-panel-border)]" /></td>
                    </tr>
                  ))
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">
                      {search ? 'No products match your search.' : 'No products found.'}
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="border-b border-[var(--color-panel-border)] last:border-0 hover:bg-black/5 dark:hover:bg-white/5">
                      <td className="px-4 py-3 font-medium text-[var(--color-text-primary)]">
                        {product.productName}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] font-mono text-xs">
                        {product.sku || '-'}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {product.categoryName || product.categoryId || '-'}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {product.sellingPrice ? `${product.sellingPrice.toLocaleString()} TZS` : '-'}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)] font-semibold">
                        {product.currentStock ?? 0}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-secondary)]">
                        {product.minimumStock ?? '-'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge stockStatus={product.stockStatus} status={product.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="Edit product"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleViewHistory(product.id)}
                            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] transition hover:bg-black/5 dark:hover:bg-white/5"
                            title="View history"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id)}
                            className="rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-500/10"
                            title="Archive product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={handlePageSizeChange}
                  className="rounded-lg border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-2 py-1 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="hidden sm:inline">
                  {startIndex + 1}–{Math.min(startIndex + pageSize, total)} of {total}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className="rounded-lg border border-[var(--color-panel-border)] p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm text-[var(--color-text-secondary)]">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page === totalPages}
                  className="rounded-lg border border-[var(--color-panel-border)] p-2 text-[var(--color-text-secondary)] transition hover:bg-[var(--color-panel-strong)] disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ---------- Product Create/Edit Modal ---------- */}
      <Modal
        isOpen={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Product Name *</label>
              <input
                type="text"
                name="productName"
                value={formData.productName}
                onChange={handleFormChange}
                required
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">SKU</label>
              <input
                type="text"
                name="sku"
                value={formData.sku}
                onChange={handleFormChange}
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Barcode</label>
              <input
                type="text"
                name="barcode"
                value={formData.barcode}
                onChange={handleFormChange}
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Unit</label>
              <input
                type="text"
                name="unit"
                value={formData.unit}
                onChange={handleFormChange}
                placeholder="e.g. piece, kg, bag"
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Category ID</label>
              <select
                name="categoryId"
                value={formData.categoryId}
                onChange={handleFormChange}
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Image URL</label>
              <input
                type="text"
                name="imageUrl"
                value={formData.imageUrl}
                onChange={handleFormChange}
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Buying Price (TZS)</label>
              <input
                type="number"
                name="buyingPrice"
                value={formData.buyingPrice}
                onChange={handleFormChange}
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Selling Price (TZS)</label>
              <input
                type="number"
                name="sellingPrice"
                value={formData.sellingPrice}
                onChange={handleFormChange}
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Minimum Stock</label>
              <input
                type="number"
                name="minimumStock"
                value={formData.minimumStock}
                onChange={handleFormChange}
                min="0"
                className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
              />
            </div>
            {!editingProduct && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Initial Stock Quantity</label>
                <input
                  type="number"
                  name="initialStockQuantity"
                  value={formData.initialStockQuantity}
                  onChange={handleFormChange}
                  min="0"
                  className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleFormChange}
              rows={3}
              className="mt-1 w-full rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] px-4 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--brand-primary)] focus:outline-none resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setProductModalOpen(false)}
              className="rounded-xl border border-[var(--color-panel-border)] px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-panel-strong)]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              {editingProduct ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Product History Drawer ---------- */}
      <Drawer
        isOpen={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
        title={`History: ${historyData?.product?.productName || 'Product'}`}
      >
        {historyLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--brand-primary)] border-t-transparent" />
          </div>
        ) : historyData?.transactions?.length > 0 ? (
          <div className="space-y-3">
            {historyData.transactions.map((txn) => (
              <div
                key={txn.id}
                className="rounded-xl border border-[var(--color-panel-border)] bg-[var(--color-panel)] p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-[var(--color-text-primary)]">
                      {txn.transactionType?.replace(/_/g, ' ') || 'Transaction'}
                    </p>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      Ref: {txn.reference || '-'}
                    </p>
                  </div>
                  <span className="text-xs text-[var(--color-text-tertiary)]">
                    {new Date(txn.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-4 text-sm">
                  <span className="text-[var(--color-text-secondary)]">
                    Qty: <span className="font-semibold text-[var(--color-text-primary)]">{txn.quantity}</span>
                  </span>
                  <span className="text-[var(--color-text-secondary)]">
                    Stock: {txn.previousStock} → {txn.newStock}
                  </span>
                  {txn.reason && (
                    <span className="text-[var(--color-text-secondary)]">
                      Reason: {txn.reason}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-[var(--color-text-secondary)]">No transaction history found.</p>
        )}
      </Drawer>
    </PageContainer>
  );
}

export default ProductsPage;
