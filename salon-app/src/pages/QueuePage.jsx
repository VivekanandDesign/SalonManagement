import { useState, useEffect } from 'react';
import { Users, UserPlus, Phone, Clock, CheckCircle, XCircle, ArrowRight, X } from 'lucide-react';
import { queue } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import { useToast } from '../components/ui/Toast';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const inputCls = 'w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200 focus:border-primary-400';

const statusMap = { WAITING: 'pending', IN_SERVICE: 'in-progress', COMPLETED: 'completed', LEFT: 'cancelled' };

export default function QueuePage() {
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({ waiting: 0, inService: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const { addToast } = useToast();

  useEffect(() => { loadQueue(); const interval = setInterval(loadQueue, 15000); return () => clearInterval(interval); }, []);

  async function loadQueue() {
    try {
      const res = await queue.list();
      setEntries(res.data || []);
      setStats(res.stats || { waiting: 0, inService: 0 });
    } catch { /* silent */ }
    setLoading(false);
  }

  async function handleAction(id, action) {
    try {
      await queue[action](id);
      loadQueue();
      addToast('Updated', 'success');
    } catch (err) { addToast(err.message, 'error'); }
  }

  if (loading) return <LoadingSpinner />;

  const waiting = entries.filter(e => e.status === 'WAITING');
  const inService = entries.filter(e => e.status === 'IN_SERVICE');
  const done = entries.filter(e => e.status === 'COMPLETED' || e.status === 'LEFT');

  return (
    <div>
      <PageHeader title="Live Queue" description="Walk-in queue management"
        actions={<Button onClick={() => setShowAddModal(true)}><UserPlus size={16} /> Add Walk-in</Button>} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={Clock} label="Waiting" value={stats.waiting} />
        <StatCard icon={Users} label="In Service" value={stats.inService} />
        <StatCard icon={CheckCircle} label="Done Today" value={done.length} />
      </div>

      {/* Three-column Kanban layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Waiting Column */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2 h-2 rounded-full bg-amber-400"></div>
            <h3 className="font-semibold text-surface-700 text-sm">Waiting ({waiting.length})</h3>
          </div>
          <div className="space-y-2">
            {waiting.map(e => (
              <Card key={e.id} className="hover:shadow-card-hover transition-shadow">
                <div className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-surface-800 truncate">{e.customer?.name || e.customerName || 'Walk-in'}</p>
                      <p className="text-xs text-surface-500">{e.customer?.phone || e.phone}</p>
                    </div>
                    <Badge status="pending" label="Waiting" />
                  </div>
                  <p className="text-xs text-surface-400 mb-3">
                    <Clock size={11} className="inline mr-1" />Joined {new Date(e.joinedAt).toLocaleTimeString()}
                    {e.estimatedWait && <span className="ml-2">· ~{e.estimatedWait}min</span>}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleAction(e.id, 'call')}><ArrowRight size={14} /> Call</Button>
                    <Button size="sm" variant="danger" onClick={() => handleAction(e.id, 'left')}>Left</Button>
                  </div>
                </div>
              </Card>
            ))}
            {waiting.length === 0 && (
              <Card>
                <div className="p-6 text-center">
                  <Clock size={24} className="text-surface-300 mx-auto mb-2" />
                  <p className="text-sm text-surface-400">No one waiting</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* In Service Column */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div>
            <h3 className="font-semibold text-surface-700 text-sm">In Service ({inService.length})</h3>
          </div>
          <div className="space-y-2">
            {inService.map(e => (
              <Card key={e.id} className="hover:shadow-card-hover transition-shadow border-blue-100">
                <div className="p-3 sm:p-4">
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-surface-800 truncate">{e.customer?.name || e.customerName}</p>
                    </div>
                    <Badge status="in-progress" label="In Service" />
                  </div>
                  <p className="text-xs text-surface-400 mb-3">
                    <Clock size={11} className="inline mr-1" />Called at {e.calledAt ? new Date(e.calledAt).toLocaleTimeString() : '—'}
                  </p>
                  <Button size="sm" onClick={() => handleAction(e.id, 'complete')}><CheckCircle size={14} /> Done</Button>
                </div>
              </Card>
            ))}
            {inService.length === 0 && (
              <Card>
                <div className="p-6 text-center">
                  <Users size={24} className="text-surface-300 mx-auto mb-2" />
                  <p className="text-sm text-surface-400">No one being served</p>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Done Column */}
        <div>
          <div className="flex items-center gap-2 mb-3 px-1">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <h3 className="font-semibold text-surface-700 text-sm">Done Today ({done.length})</h3>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {done.map(e => (
              <Card key={e.id} className="opacity-60">
                <div className="p-3 sm:p-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-surface-800 truncate">{e.customer?.name || e.customerName}</p>
                    <p className="text-xs text-surface-500">
                      {e.completedAt ? new Date(e.completedAt).toLocaleTimeString() : 'Left'}
                    </p>
                  </div>
                  <Badge status={statusMap[e.status]} label={e.status === 'COMPLETED' ? 'Done' : 'Left'} />
                </div>
              </Card>
            ))}
            {done.length === 0 && (
              <Card>
                <div className="p-6 text-center">
                  <CheckCircle size={24} className="text-surface-300 mx-auto mb-2" />
                  <p className="text-sm text-surface-400">No completed entries</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {showAddModal && <AddQueueModal onClose={() => setShowAddModal(false)} onSave={loadQueue} />}
    </div>
  );
}

function AddQueueModal({ onClose, onSave }) {
  const [form, setForm] = useState({ customerName: '', phone: '', estimatedWait: 15 });
  const [saving, setSaving] = useState(false);
  const { addToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await queue.add({ ...form, estimatedWait: parseInt(form.estimatedWait) });
      addToast('Added to queue', 'success');
      onSave(); onClose();
    } catch (err) { addToast(err.message, 'error'); }
    setSaving(false);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-[9998]" onClick={onClose} />
      <div className="fixed top-0 right-0 h-full w-full sm:w-[440px] bg-white shadow-xl z-[9999] flex flex-col animate-slide-in-right">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-800">Add Walk-in Customer</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Customer Name *</label>
              <input className={inputCls} placeholder="Walk-in customer name" value={form.customerName} onChange={e => setForm({ ...form, customerName: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Phone Number</label>
              <input className={inputCls} placeholder="Optional phone number" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-600 mb-1">Estimated Wait (minutes)</label>
              <input type="number" className={inputCls} value={form.estimatedWait} onChange={e => setForm({ ...form, estimatedWait: e.target.value })} />
            </div>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 15, 20, 30].map(m => (
                <button type="button" key={m} onClick={() => setForm({ ...form, estimatedWait: m })}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${Number(form.estimatedWait) === m ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-surface-200 text-surface-500 hover:bg-surface-50'}`}>
                  {m} min
                </button>
              ))}
            </div>
          </div>
          <div className="px-5 py-4 border-t border-surface-100 flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Adding...' : 'Add to Queue'}</Button>
          </div>
        </form>
      </div>
    </>
  );
}
