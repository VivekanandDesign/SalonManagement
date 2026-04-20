import { useState, useEffect } from 'react';
import { Package, Plus, AlertTriangle, TrendingUp, Edit, Trash2, Search, X } from 'lucide-react';
import { products } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import StatCard from '../components/ui/StatCard';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import EmptyState from '../components/ui/EmptyState';

const inputCls = 'w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400';

export default function ProductsPage() {
  const [productList, setProductList] = useState([]);
  const [lowStockList, setLowStockList] = useState([]);
  const [salesData, setSalesData] = useState({ data: [], totalRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('inventory');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const { addToast } = useToast();

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [prodRes, lowRes, salesRes] = await Promise.all([
        products.list(),
        products.lowStock(),
        products.salesHistory(),
      ]);
      setProductList(prodRes.data || []);
      setLowStockList(lowRes.data || []);
      setSalesData(salesRes);
    } catch { addToast('Failed to load', 'error'); }
    setLoading(false);
  }

  if (loading) return <LoadingSpinner />;

  const activeProducts = productList.filter(p => p.isActive);
  const totalStock = activeProducts.reduce((s, p) => s + p.stock, 0);

  return (
    <div>
      <PageHeader title="Products" description="Manage retail products and track sales"
        actions={<Button onClick={() => { setEditProduct(null); setShowModal(true); }}><Plus size={16} /> Add Product</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Products" value={activeProducts.length} icon={Package} />
        <StatCard label="Total Stock" value={totalStock} icon={Package} />
        <StatCard label="Low Stock" value={lowStockList.length} icon={AlertTriangle} />
        <StatCard label="Sales Revenue" value={`₹${Math.round(salesData.totalRevenue).toLocaleString()}`} icon={TrendingUp} />
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {[
          { key: 'inventory', label: 'Inventory', icon: Package },
          { key: 'sales', label: 'Sales History', icon: TrendingUp },
          { key: 'low-stock', label: `Low Stock (${lowStockList.length})`, icon: AlertTriangle },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap ${
              tab === t.key ? 'bg-primary-50 text-primary-700 border-primary-200' : 'text-surface-500 border-surface-200 hover:bg-surface-50'
            }`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'inventory' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50/70">
                  <th className="px-3 sm:px-4 py-3 text-left font-semibold text-surface-600">Product</th>
                  <th className="px-3 sm:px-4 py-3 text-left font-semibold text-surface-600 hidden sm:table-cell">Brand</th>
                  <th className="px-3 sm:px-4 py-3 text-right font-semibold text-surface-600">Price</th>
                  <th className="px-3 sm:px-4 py-3 text-right font-semibold text-surface-600">Stock</th>
                  <th className="px-3 sm:px-4 py-3 text-right font-semibold text-surface-600 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activeProducts.map(p => (
                  <tr key={p.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                    <td className="px-3 sm:px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-surface-800 truncate">{p.name}</p>
                        <p className="text-xs text-surface-400 sm:hidden">{p.brand || '—'}</p>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-surface-500 hidden sm:table-cell">{p.brand || '—'}</td>
                    <td className="px-3 sm:px-4 py-3 text-right font-medium">₹{p.price}</td>
                    <td className={`px-3 sm:px-4 py-3 text-right font-medium ${p.stock <= 5 ? 'text-red-600' : 'text-surface-700'}`}>{p.stock}</td>
                    <td className="px-3 sm:px-4 py-3 text-right">
                      <div className="flex justify-end gap-0.5">
                        <button onClick={() => { setEditProduct(p); setShowModal(true); }} className="p-1.5 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"><Edit size={16} /></button>
                        <button onClick={async () => { try { await products.delete(p.id); addToast('Deleted', 'success'); loadData(); } catch (err) { addToast(err.message, 'error'); } }} className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {activeProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Package size={32} className="text-surface-300" />
                        <p className="text-surface-400 font-medium">No products yet</p>
                        <p className="text-xs text-surface-300">Add your first retail product</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === 'sales' && (
        <div className="space-y-3">
          {salesData.data.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No sales yet" description="Sales will appear here when products are sold via invoices" />
          ) : salesData.data.map(s => (
            <Card key={s.id}>
              <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-surface-800 truncate">{s.product?.name}</p>
                  <p className="text-xs text-surface-500">Qty: {s.quantity} × ₹{s.price}</p>
                </div>
                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="font-semibold text-surface-800">₹{s.quantity * s.price}</p>
                  <p className="text-xs text-surface-500">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'low-stock' && (
        <div className="space-y-2">
          {lowStockList.length === 0 ? (
            <Card>
              <div className="p-6 text-center">
                <p className="text-sm text-green-600 font-medium">All products are well-stocked!</p>
              </div>
            </Card>
          ) : lowStockList.map(p => (
            <Card key={p.id}>
              <div className="p-3 sm:p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-surface-800 truncate">{p.name}</p>
                  <p className="text-xs text-surface-500">{p.brand}</p>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-50 text-red-700 border-red-200 flex-shrink-0">{p.stock} left</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && <ProductModal product={editProduct} onClose={() => setShowModal(false)} onSave={loadData} />}
    </div>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const [form, setForm] = useState({
    name: product?.name || '', brand: product?.brand || '', price: product?.price || '', stock: product?.stock || 0,
  });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock) };
      if (product) await products.update(product.id, data);
      else await products.create(data);
      addToast(product ? 'Updated' : 'Created', 'success');
      onSave(); onClose();
    } catch (err) { addToast(err.message, 'error'); }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-[9999] flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-800">{product ? 'Edit Product' : 'Add Product'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Product Name *</label>
              <input className={inputCls} placeholder="e.g. Hair Serum" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Brand</label>
              <input className={inputCls} placeholder="e.g. L'Oréal" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Price (₹) *</label>
                <input type="number" className={inputCls} placeholder="0.00" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-600 mb-1">Stock Qty</label>
                <input type="number" className={inputCls} value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="px-5 py-4 border-t border-surface-100 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Saving...' : product ? 'Update Product' : 'Add Product'}</Button>
          </div>
        </form>
      </div>
    </>
  );
}
