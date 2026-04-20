import { useState, useEffect } from 'react';
import { Scissors, Plus, Edit, ToggleLeft, ToggleRight, Trash2, Package } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { Card, CardHeader } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { services as servicesApi, staff as staffApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const emptyForm = { name: '', category: 'Hair', duration: 30, price: 0, categoryId: '', staffIds: [] };
const emptyComboForm = { name: '', price: 0, serviceIds: [] };

export default function ServicesPage() {
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [combos, setCombos] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const [svcRes, catRes, comboRes, staffRes] = await Promise.all([servicesApi.list(), servicesApi.categories(), servicesApi.listCombos(), staffApi.list()]);
        setAllStaff((staffRes.data || []).filter(u => u.isActive !== false).map(u => ({ id: u.id, name: u.name })));
        setServices((svcRes.data || []).map(s => ({
          id: s.id, name: s.name, category: s.category?.name || '', categoryId: s.categoryId,
          duration: s.duration, price: s.price, status: s.isActive ? 'active' : 'inactive',
          staffIds: (s.staffServices || []).map(ss => ss.user?.id || ss.userId).filter(Boolean),
          staffNames: (s.staffServices || []).map(ss => ss.user?.name).filter(Boolean),
        })));
        setCategories((catRes.data || []).map(c => c.name));
        setCombos((comboRes.data || []).map(c => ({
          id: c.id, name: c.name, price: c.price, isActive: c.isActive !== false,
          services: (c.items || []).map(i => ({ id: i.service?.id, name: i.service?.name, price: i.service?.price, duration: i.service?.duration })),
          serviceIds: (c.items || []).map(i => i.service?.id).filter(Boolean),
        })));
      } catch (err) { console.error('Failed to load services:', err); toast.error(err.message || 'Failed to load services'); }
      setLoading(false);
    }
    load();
  }, []);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [showComboModal, setShowComboModal] = useState(false);
  const [editingCombo, setEditingCombo] = useState(null);
  const [comboForm, setComboForm] = useState(emptyComboForm);

  const CATEGORIES = categories.length > 0 ? categories : ['Hair', 'Skin', 'Nails', 'Spa'];

  const grouped = CATEGORIES.map(cat => ({
    name: cat,
    services: services.filter(s => s.category === cat),
  })).filter(g => g.services.length > 0);

  const openAdd = () => { setEditing(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (svc) => { setEditing(svc); setForm({ name: svc.name, category: svc.category, duration: svc.duration, price: svc.price, staffIds: svc.staffIds || [] }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await servicesApi.update(editing.id, { name: form.name, categoryId: editing.categoryId, duration: Number(form.duration), price: Number(form.price), staffIds: form.staffIds });
        const staffNames = allStaff.filter(s => form.staffIds.includes(s.id)).map(s => s.name);
        setServices(prev => prev.map(s => s.id === editing.id ? { ...s, ...form, price: Number(form.price), duration: Number(form.duration), staffIds: form.staffIds, staffNames } : s));
        toast.success('Service updated');
      } else {
        const res = await servicesApi.create({ name: form.name, categoryId: form.categoryId || undefined, duration: Number(form.duration), price: Number(form.price), staffIds: form.staffIds });
        const staffNames = allStaff.filter(s => form.staffIds.includes(s.id)).map(s => s.name);
        setServices(prev => [...prev, { id: res.id, name: form.name, category: form.category, categoryId: res.categoryId, duration: Number(form.duration), price: Number(form.price), status: 'active', staffIds: form.staffIds, staffNames }]);
        toast.success('Service created');
      }
    } catch (err) { toast.error(err.message || 'Failed to save service'); }
    setShowModal(false);
  };

  const toggleStatus = async (id) => {
    const svc = services.find(s => s.id === id);
    if (!svc) return;
    try {
      await servicesApi.update(id, { isActive: svc.status !== 'active' });
      setServices(prev => prev.map(s => s.id === id ? { ...s, status: s.status === 'active' ? 'inactive' : 'active' } : s));
      toast.success(svc.status === 'active' ? 'Service deactivated' : 'Service activated');
    } catch (err) { toast.error(err.message || 'Failed to toggle service status'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this service?')) return;
    try {
      await servicesApi.remove(id);
      setServices(prev => prev.filter(s => s.id !== id));
      toast.success('Service deleted');
    } catch (err) { toast.error(err.message || 'Failed to delete service'); }
  };

  // Combo CRUD
  const openAddCombo = () => { setEditingCombo(null); setComboForm(emptyComboForm); setShowComboModal(true); };
  const openEditCombo = (c) => { setEditingCombo(c); setComboForm({ name: c.name, price: c.price, serviceIds: [...c.serviceIds] }); setShowComboModal(true); };
  const toggleComboService = (svcId) => {
    setComboForm(prev => ({
      ...prev,
      serviceIds: prev.serviceIds.includes(svcId) ? prev.serviceIds.filter(id => id !== svcId) : [...prev.serviceIds, svcId],
    }));
  };
  const handleSaveCombo = async (e) => {
    e.preventDefault();
    try {
      if (editingCombo) {
        const res = await servicesApi.updateCombo(editingCombo.id, { name: comboForm.name, price: Number(comboForm.price), serviceIds: comboForm.serviceIds });
        setCombos(prev => prev.map(c => c.id === editingCombo.id ? {
          ...c, name: comboForm.name, price: Number(comboForm.price),
          serviceIds: comboForm.serviceIds,
          services: services.filter(s => comboForm.serviceIds.includes(s.id)).map(s => ({ id: s.id, name: s.name, price: s.price, duration: s.duration })),
        } : c));
        toast.success('Combo updated');
      } else {
        const res = await servicesApi.createCombo({ name: comboForm.name, price: Number(comboForm.price), serviceIds: comboForm.serviceIds });
        setCombos(prev => [...prev, {
          id: res.id, name: comboForm.name, price: Number(comboForm.price), isActive: true,
          serviceIds: comboForm.serviceIds,
          services: services.filter(s => comboForm.serviceIds.includes(s.id)).map(s => ({ id: s.id, name: s.name, price: s.price, duration: s.duration })),
        }]);
        toast.success('Combo created');
      }
    } catch (err) { toast.error(err.message || 'Failed to save combo'); }
    setShowComboModal(false);
  };
  const handleDeleteCombo = async (id) => {
    if (!window.confirm('Delete this combo package?')) return;
    try {
      await servicesApi.deleteCombo(id);
      setCombos(prev => prev.filter(c => c.id !== id));
      toast.success('Combo deleted');
    } catch (err) { toast.error(err.message || 'Failed to delete combo'); }
  };
  const comboIndividualTotal = (combo) => combo.services.reduce((s, svc) => s + (svc.price || 0), 0);
  const comboSavings = (combo) => comboIndividualTotal(combo) - combo.price;

  return (
    <div>
      <PageHeader title="Services & Menu" description="Manage your salon service offerings"
        actions={user?.role === 'admin' ? <Button onClick={openAdd}><Plus size={16} /> Add Service</Button> : null} />

      {loading ? (
        <LoadingSpinner message="Loading services..." />
      ) : (
      <div className="space-y-6">
        {grouped.map((cat) => (
          <Card key={cat.name}>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Scissors size={16} className="text-primary-500" />
                <h2 className="text-base font-semibold text-surface-700">{cat.name}</h2>
                <span className="text-xs text-surface-400">({cat.services.length} services)</span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 text-left">
                    <th className="px-5 py-2.5 font-medium text-surface-500">Service</th>
                    <th className="px-5 py-2.5 font-medium text-surface-500 hidden sm:table-cell">Duration</th>
                    <th className="px-5 py-2.5 font-medium text-surface-500">Price</th>
                    <th className="px-5 py-2.5 font-medium text-surface-500 hidden md:table-cell">Stylists</th>
                    <th className="px-5 py-2.5 font-medium text-surface-500">Status</th>
                    <th className="px-5 py-2.5 font-medium text-surface-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cat.services.map((svc) => (
                    <tr key={svc.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-surface-700">{svc.name}</td>
                      <td className="px-5 py-3 text-surface-500 hidden sm:table-cell">{svc.duration} min</td>
                      <td className="px-5 py-3 text-surface-600 font-medium">{'\u20B9'}{svc.price}</td>
                      <td className="px-5 py-3 text-surface-500 hidden md:table-cell">
                        {svc.staffNames?.length > 0
                          ? <span className="text-xs">{svc.staffNames.join(', ')}</span>
                          : <span className="text-xs text-surface-300">—</span>}
                      </td>
                      <td className="px-5 py-3"><Badge status={svc.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          {user?.role === 'admin' && <Button variant="ghost" size="sm" onClick={() => openEdit(svc)}><Edit size={14} /></Button>}
                          {user?.role === 'admin' && <Button variant="ghost" size="sm" onClick={() => toggleStatus(svc.id)}>
                            {svc.status === 'active' ? <ToggleRight size={14} className="text-success-500" /> : <ToggleLeft size={14} className="text-surface-400" />}
                          </Button>}
                          {user?.role === 'admin' && <Button variant="ghost" size="sm" onClick={() => handleDelete(svc.id)}><Trash2 size={14} className="text-danger-500" /></Button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>
      )}

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Service' : 'Add New Service'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Service Name *</label>
              <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Category *</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Duration (minutes) *</label>
              <input type="number" required min={5} value={form.duration} onChange={e => setForm({...form, duration: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Price ({'\u20B9'}) *</label>
              <input type="number" required min={0} value={form.price} onChange={e => setForm({...form, price: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
          </div>
          {allStaff.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-2">Assigned Stylists</label>
              <div className="max-h-36 overflow-y-auto border border-surface-200 rounded-lg p-2 space-y-1">
                {allStaff.map(s => (
                  <label key={s.id} className={`flex items-center gap-2 p-1.5 rounded-lg cursor-pointer transition-colors ${form.staffIds.includes(s.id) ? 'bg-primary-50' : 'hover:bg-surface-50'}`}>
                    <input type="checkbox" checked={form.staffIds.includes(s.id)}
                      onChange={() => setForm(prev => ({ ...prev, staffIds: prev.staffIds.includes(s.id) ? prev.staffIds.filter(id => id !== s.id) : [...prev.staffIds, s.id] }))}
                      className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-200" />
                    <span className="text-sm text-surface-700">{s.name}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-surface-400 mt-1">Select the stylists who can perform this service</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Save Changes' : 'Add Service'}</Button>
          </div>
        </form>
      </Modal>

      {/* Combo Packages Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package size={18} className="text-primary-500" />
            <h2 className="text-lg font-semibold text-surface-700">Combo Packages</h2>
            <span className="text-xs text-surface-400">({combos.length} packages)</span>
          </div>
          {user?.role === 'admin' && <Button size="sm" onClick={openAddCombo}><Plus size={14} /> Add Combo</Button>}
        </div>
        {combos.length === 0 ? (
          <Card><div className="p-8 text-center text-surface-400 text-sm">No combo packages yet. Create one to offer bundled services at a discount.</div></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {combos.map(combo => (
              <Card key={combo.id}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-surface-700">{combo.name}</h3>
                      <p className="text-xs text-surface-400 mt-0.5">{combo.services.length} services included</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary-600">{'\u20B9'}{combo.price}</p>
                      {comboSavings(combo) > 0 && (
                        <p className="text-[10px] text-green-600 font-medium">Save {'\u20B9'}{comboSavings(combo)}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-3">
                    {combo.services.map(svc => (
                      <div key={svc.id} className="flex items-center justify-between text-xs">
                        <span className="text-surface-600">{svc.name}</span>
                        <span className="text-surface-400 line-through">{'\u20B9'}{svc.price}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-surface-100">
                    <span className="text-xs text-surface-400">
                      {combo.services.reduce((s, svc) => s + (svc.duration || 0), 0)} min total
                    </span>
                    {user?.role === 'admin' && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditCombo(combo)}><Edit size={14} /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteCombo(combo.id)}><Trash2 size={14} className="text-danger-500" /></Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Combo Modal */}
      <Modal isOpen={showComboModal} onClose={() => setShowComboModal(false)} title={editingCombo ? 'Edit Combo Package' : 'Create Combo Package'}>
        <form onSubmit={handleSaveCombo} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Package Name *</label>
              <input required value={comboForm.name} onChange={e => setComboForm({...comboForm, name: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Package Price ({'\u20B9'}) *</label>
              <input type="number" required min={0} value={comboForm.price} onChange={e => setComboForm({...comboForm, price: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-2">Select Services *</label>
            <div className="max-h-48 overflow-y-auto border border-surface-200 rounded-lg p-2 space-y-1">
              {services.filter(s => s.status === 'active').map(svc => (
                <label key={svc.id} className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${comboForm.serviceIds.includes(svc.id) ? 'bg-primary-50 border border-primary-200' : 'hover:bg-surface-50 border border-transparent'}`}>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={comboForm.serviceIds.includes(svc.id)} onChange={() => toggleComboService(svc.id)}
                      className="w-4 h-4 rounded border-surface-300 text-primary-500 focus:ring-primary-200" />
                    <span className="text-sm text-surface-700">{svc.name}</span>
                    <span className="text-xs text-surface-400">({svc.duration} min)</span>
                  </div>
                  <span className="text-sm text-surface-500">{'\u20B9'}{svc.price}</span>
                </label>
              ))}
            </div>
            {comboForm.serviceIds.length > 0 && (
              <div className="mt-2 flex items-center justify-between text-xs text-surface-500">
                <span>{comboForm.serviceIds.length} selected</span>
                <span>Individual total: {'\u20B9'}{services.filter(s => comboForm.serviceIds.includes(s.id)).reduce((sum, s) => sum + s.price, 0)}</span>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowComboModal(false)}>Cancel</Button>
            <Button type="submit" disabled={comboForm.serviceIds.length < 2}>{editingCombo ? 'Save Changes' : 'Create Combo'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
