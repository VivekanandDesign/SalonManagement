import { useState, useEffect } from 'react';
import { Gift, Plus, Edit2, Trash2, Award, Users, TrendingUp, Clock, Star, ArrowRight, Bell, MessageSquare, Send, CheckCircle, ChevronRight, History, Crown, Shield, Zap } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardBody } from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import WhatsAppSendModal from '../components/ui/WhatsAppSendModal';
import { useToast } from '../components/ui/Toast';
import { loyalty as loyaltyApi, customers as customersApi } from '../services/api';

const initialRules = [];

const TRIGGERS = [
  { value: 'first_visit', label: 'First Visit' },
  { value: 'visit_count', label: 'Visit Count Milestone' },
  { value: 'birthday', label: 'Birthday' },
  { value: 'referral', label: 'Referral' },
  { value: 'spend_milestone', label: 'Spend Milestone' },
];

const TIERS = { Bronze: { min: 0, color: 'text-amber-700 bg-amber-50 border-amber-200', icon: Shield, pointsNeeded: 0 }, Silver: { min: 300, color: 'text-surface-600 bg-surface-100 border-surface-200', icon: Star, pointsNeeded: 300 }, Gold: { min: 800, color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Crown, pointsNeeded: 800 }, Platinum: { min: 1500, color: 'text-purple-700 bg-purple-50 border-purple-200', icon: Zap, pointsNeeded: 1500 } };

const initialReminders = [];

const TIER_ORDER = ['Bronze', 'Silver', 'Gold', 'Platinum'];

function getTier(points) {
  if (points >= 1500) return 'Platinum';
  if (points >= 800) return 'Gold';
  if (points >= 300) return 'Silver';
  return 'Bronze';
}

const emptyRule = { name: '', trigger: 'first_visit', visitCount: 5, spendAmount: 5000, reward: '', points: 0 };

export default function LoyaltyPage() {
  const [rules, setRules] = useState(initialRules);
  const [members, setMembers] = useState([]);
  const [pointsHistory, setPointsHistory] = useState([]);
  const [referralLog, setReferralLog] = useState([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleForm, setRuleForm] = useState(emptyRule);
  const [refForm, setRefForm] = useState({ referrer: '', newCustomer: '', phone: '' });
  const [view, setView] = useState('members');
  const [reminders, setReminders] = useState(initialReminders);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [reminderForm, setReminderForm] = useState({ name: '', trigger: '24hrs_before_appointment', channel: 'whatsapp', template: '' });
  const [waModal, setWaModal] = useState({ open: false, customer: null, vars: {} });
  const toast = useToast();

  useEffect(() => {
    async function load() {
      try {
        const [configRes, rewardsRes, custRes] = await Promise.all([
          loyaltyApi.configs(),
          loyaltyApi.rewards(),
          customersApi.list({ limit: 500 }),
        ]);
        // Load rules from configs
        if (configRes.data && configRes.data.length > 0) {
          setRules(configRes.data.map(c => ({
            id: c.id, name: c.milestoneName, trigger: 'visit_count', visitCount: c.visitThreshold,
            reward: `${c.discountType === 'percentage' ? c.discountValue + '% off' : '₹' + c.discountValue + ' off'}`,
            points: c.visitThreshold * 20, active: c.isActive,
          })));
        }
        // Build members from customers
        const rewards = rewardsRes.data || [];
        const customers = (custRes.data || []);
        // Count rewards per customer
        const rewardsByCustomer = {};
        rewards.forEach(r => {
          if (!rewardsByCustomer[r.customerId]) rewardsByCustomer[r.customerId] = [];
          rewardsByCustomer[r.customerId].push(r);
        });
        const memberList = customers.map(c => {
          const custRewards = rewardsByCustomer[c.id] || [];
          const earnedPoints = (c.totalVisits || 0) * 20; // 20 pts per visit
          const redeemedPoints = custRewards.filter(r => r.isRedeemed).length * 100;
          const points = Math.max(0, earnedPoints - redeemedPoints);
          return {
            id: c.id, name: c.name, phone: c.phone || '',
            visits: c.totalVisits || 0, totalSpent: c.totalSpent || 0,
            points, tier: getTier(points), referrals: 0,
            lastVisit: c.lastVisitAt ? c.lastVisitAt.slice(0, 10) : '',
          };
        });
        setMembers(memberList);
        // Build points history from rewards
        const history = rewards.map((r, i) => ({
          id: r.id || i + 1,
          member: r.customer?.name || 'Unknown',
          type: r.isRedeemed ? 'redeemed' : 'earned',
          points: r.isRedeemed ? -(r.loyaltyConfig?.visitThreshold || 5) * 20 : (r.loyaltyConfig?.visitThreshold || 5) * 20,
          reason: r.isRedeemed
            ? `Redeemed: ${r.loyaltyConfig?.milestoneName || 'Reward'}`
            : `Milestone: ${r.loyaltyConfig?.milestoneName || 'Reward'}`,
          date: (r.redeemedAt || r.createdAt || '').slice(0, 10),
        }));
        setPointsHistory(history);
      } catch (err) { console.error('Failed to load loyalty data:', err); toast.error('Failed to load loyalty data'); }
    }
    load();
  }, []);

  const totalMembers = members.length;
  const totalPoints = members.reduce((s, m) => s + m.points, 0);
  const totalReferrals = members.reduce((s, m) => s + m.referrals, 0);
  const activeRules = rules.filter(r => r.active).length;

  const openAddRule = () => { setEditingRule(null); setRuleForm(emptyRule); setShowRuleModal(true); };
  const openEditRule = (rule) => { setEditingRule(rule); setRuleForm({ name: rule.name, trigger: rule.trigger, visitCount: rule.visitCount || 5, spendAmount: rule.spendAmount || 5000, reward: rule.reward, points: rule.points }); setShowRuleModal(true); };

  const saveRule = (e) => {
    e.preventDefault();
    if (editingRule) {
      setRules(prev => prev.map(r => r.id === editingRule.id ? { ...r, ...ruleForm, points: Number(ruleForm.points) } : r));
    } else {
      setRules(prev => [...prev, { id: Date.now(), ...ruleForm, points: Number(ruleForm.points), active: true }]);
    }
    setShowRuleModal(false);
  };

  const deleteRule = (id) => setRules(prev => prev.filter(r => r.id !== id));
  const toggleRule = (id) => setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));

  const recordReferral = async (e) => {
    e.preventDefault();
    try {
      const referrer = members.find(m => m.name === refForm.referrer);
      if (!referrer) return;
      await customersApi.recordReferral({ referrerId: referrer.id, newCustomerName: refForm.newCustomer, newCustomerPhone: refForm.phone || '' });
      const referralRule = rules.find(r => r.trigger === 'referral' && r.active);
      const bonusPoints = referralRule ? referralRule.points : 150;
      setMembers(prev => prev.map(m => m.name === refForm.referrer ? { ...m, referrals: m.referrals + 1, points: m.points + bonusPoints } : m));
      toast.success('Referral recorded successfully');
    } catch (err) { console.error('Failed to record referral:', err); toast.error('Failed to record referral'); }
    setShowReferral(false);
    setRefForm({ referrer: '', newCustomer: '', phone: '' });
  };

  const tierColor = (tier) => TIERS[tier]?.color || 'text-surface-600 bg-surface-100 border-surface-200';

  const toggleReminder = (id) => setReminders(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  const deleteReminder = (id) => setReminders(prev => prev.filter(r => r.id !== id));
  const openAddReminder = () => { setEditingReminder(null); setReminderForm({ name: '', trigger: '24hrs_before_appointment', channel: 'whatsapp', template: '' }); setShowReminderModal(true); };
  const openEditReminder = (r) => { setEditingReminder(r); setReminderForm({ name: r.name, trigger: r.trigger, channel: r.channel, template: r.template }); setShowReminderModal(true); };
  const saveReminder = (e) => {
    e.preventDefault();
    if (editingReminder) {
      setReminders(prev => prev.map(r => r.id === editingReminder.id ? { ...r, ...reminderForm } : r));
    } else {
      setReminders(prev => [...prev, { id: Date.now(), ...reminderForm, active: true }]);
    }
    setShowReminderModal(false);
  };

  const REMINDER_TRIGGERS = [
    { value: '24hrs_before_appointment', label: '24h Before Appointment' },
    { value: '1hr_before_appointment', label: '1h Before Appointment' },
    { value: 'on_birthday', label: 'On Birthday' },
    { value: '1hr_after_visit', label: '1h After Visit' },
    { value: '7days_after_visit', label: '7 Days After Visit' },
    { value: '30days_no_visit', label: '30 Days No Visit' },
    { value: '60days_no_visit', label: '60 Days No Visit' },
    { value: 'weekly', label: 'Weekly Digest' },
  ];

  return (
    <div>
      <PageHeader title="Loyalty Program" description="Rewards, points, and customer retention"
        actions={<><Button variant="outline" onClick={() => setShowReferral(true)}><Users size={16} /> Record Referral</Button><Button onClick={openAddRule}><Plus size={16} /> Add Rule</Button></>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Total Members" value={totalMembers} />
        <StatCard icon={Award} label="Points Earned" value={totalPoints.toLocaleString()} />
        <StatCard icon={TrendingUp} label="Referrals" value={totalReferrals} />
        <StatCard icon={Gift} label="Active Rules" value={activeRules} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto">
        {[
          { key: 'members', label: 'Members', icon: Users },
          { key: 'tiers', label: 'Tiers', icon: Crown },
          { key: 'history', label: 'Points History', icon: History },
          { key: 'referrals', label: 'Referrals', icon: ArrowRight },
          { key: 'rules', label: 'Rules', icon: Gift },
          { key: 'reminders', label: 'Reminders', icon: Bell },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setView(tab.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition-colors whitespace-nowrap
                ${view === tab.key ? 'bg-primary-50 text-primary-700 border-primary-200' : 'text-surface-500 border-surface-200 hover:bg-surface-50'}`}>
              <Icon size={14} /> {tab.label}
            </button>
          );
        })}
      </div>

      {view === 'members' && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-surface-700">Loyalty Members</h2></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 text-left">
                  <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Member</th>
                  <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Tier</th>
                  <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Points</th>
                  <th className="px-5 py-3 font-medium text-surface-500 hidden sm:table-cell">Visits</th>
                  <th className="px-5 py-3 font-medium text-surface-500 hidden lg:table-cell">Total Spent</th>
                  <th className="px-5 py-3 font-medium text-surface-500 hidden md:table-cell">Referrals</th>
                  <th className="px-5 py-3 font-medium text-surface-500 hidden md:table-cell">Last Visit</th>
                  <th className="px-5 py-3 font-medium text-surface-500 hidden lg:table-cell">Next Reward</th>
                  <th className="px-3 sm:px-5 py-3 font-medium text-surface-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const nextVisitRule = rules.filter(r => r.trigger === 'visit_count' && r.active).sort((a, b) => a.visitCount - b.visitCount).find(r => r.visitCount > m.visits);
                  const progress = nextVisitRule ? Math.round((m.visits / nextVisitRule.visitCount) * 100) : 100;
                  return (
                    <tr key={m.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                      <td className="px-3 sm:px-5 py-3"><div className="font-medium text-surface-700">{m.name}</div><div className="text-xs text-surface-400">{m.phone}</div></td>
                      <td className="px-3 sm:px-5 py-3"><span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${tierColor(m.tier)}`}>{m.tier}</span></td>
                      <td className="px-3 sm:px-5 py-3 font-semibold text-primary-600">{m.points}</td>
                      <td className="px-5 py-3 text-surface-600 hidden sm:table-cell">{m.visits}</td>
                      <td className="px-5 py-3 text-surface-600 hidden lg:table-cell">{'\u20B9'}{m.totalSpent.toLocaleString()}</td>
                      <td className="px-5 py-3 text-surface-600 hidden md:table-cell">{m.referrals}</td>
                      <td className="px-5 py-3 text-surface-400 text-xs hidden md:table-cell">{m.lastVisit}</td>
                      <td className="px-5 py-3 hidden lg:table-cell">{nextVisitRule ? (
                        <div>
                          <div className="text-xs text-surface-500 mb-1">{nextVisitRule.reward} ({m.visits}/{nextVisitRule.visitCount} visits)</div>
                          <div className="w-full h-1.5 bg-surface-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-400 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                          </div>
                        </div>
                      ) : <span className="text-xs text-success-600">All milestones reached!</span>}</td>
                      <td className="px-3 sm:px-5 py-3">
                        <button onClick={() => setWaModal({ open: true, customer: { id: m.id, name: m.name, phone: m.phone }, vars: { points: m.points, tier: m.tier } })}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                          <MessageSquare size={10} /> Send Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {view === 'rules' && (
        <div className="space-y-3">
          {rules.map(rule => (
            <Card key={rule.id} className={!rule.active ? 'opacity-60' : ''}>
              <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${rule.active ? 'bg-primary-50 text-primary-600' : 'bg-surface-100 text-surface-400'}`}>
                    <Gift size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-surface-700">{rule.name}</h3>
                    <p className="text-xs text-surface-400">Trigger: {TRIGGERS.find(t => t.value === rule.trigger)?.label}
                      {rule.trigger === 'visit_count' && ` (${rule.visitCount} visits)`}
                      {rule.trigger === 'spend_milestone' && ` (\u20B9${rule.spendAmount})`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-surface-700">{rule.reward}</p>
                    <p className="text-xs text-primary-500">+{rule.points} points</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleRule(rule.id)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${rule.active ? 'bg-primary-400' : 'bg-surface-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${rule.active ? 'translate-x-4' : ''}`} />
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => openEditRule(rule)}><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)}><Trash2 size={14} className="text-danger-500" /></Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tiers Tab */}
      {view === 'tiers' && (
        <div className="space-y-4">
          <Card>
            <CardHeader><h2 className="text-base font-semibold text-surface-700">Tier System</h2></CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {TIER_ORDER.map((tier, idx) => {
                  const t = TIERS[tier];
                  const Icon = t.icon;
                  const count = members.filter(m => m.tier === tier).length;
                  const nextTier = TIER_ORDER[idx + 1];
                  return (
                    <div key={tier} className={`p-4 rounded-xl border-2 ${t.color} relative`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-lg bg-white/60 flex items-center justify-center">
                          <Icon size={20} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm">{tier}</h3>
                          <p className="text-[10px] opacity-75">{t.pointsNeeded}+ points</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="opacity-70">Members</span><span className="font-semibold">{count}</span></div>
                        <div className="flex justify-between"><span className="opacity-70">Points to reach</span><span className="font-semibold">{t.pointsNeeded}</span></div>
                        {nextTier && <div className="flex justify-between"><span className="opacity-70">Next tier</span><span className="font-semibold">{nextTier} ({TIERS[nextTier].pointsNeeded} pts)</span></div>}
                      </div>
                      {idx < TIER_ORDER.length - 1 && (
                        <div className="hidden lg:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10">
                          <ChevronRight size={18} className="text-surface-300" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader><h2 className="text-base font-semibold text-surface-700">Member Tier Progress</h2></CardHeader>
            <CardBody className="space-y-3">
              {members.map(m => {
                const currentIdx = TIER_ORDER.indexOf(m.tier);
                const nextTier = TIER_ORDER[currentIdx + 1];
                const nextPoints = nextTier ? TIERS[nextTier].pointsNeeded : m.points;
                const currentMin = TIERS[m.tier].pointsNeeded;
                const progress = nextTier ? Math.min(100, Math.round(((m.points - currentMin) / (nextPoints - currentMin)) * 100)) : 100;
                const Icon = TIERS[m.tier].icon;
                return (
                  <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50/50 border border-surface-100">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${TIERS[m.tier].color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-surface-700 truncate">{m.name}</span>
                        <span className="text-xs font-semibold text-primary-600">{m.points} pts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${progress >= 100 ? 'bg-green-400' : progress >= 60 ? 'bg-primary-400' : 'bg-amber-400'}`} style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-[10px] text-surface-400 w-16 text-right flex-shrink-0">
                          {nextTier ? `${nextPoints - m.points} to ${nextTier}` : 'Max tier!'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Points History Tab */}
      {view === 'history' && (
        <Card>
          <CardHeader><h2 className="text-base font-semibold text-surface-700">Points Transaction History</h2></CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-100 text-left">
                  <th className="px-5 py-3 font-medium text-surface-500">Date</th>
                  <th className="px-5 py-3 font-medium text-surface-500">Member</th>
                  <th className="px-5 py-3 font-medium text-surface-500">Type</th>
                  <th className="px-5 py-3 font-medium text-surface-500">Points</th>
                  <th className="px-5 py-3 font-medium text-surface-500">Reason</th>
                </tr>
              </thead>
              <tbody>
                {pointsHistory.map(h => (
                  <tr key={h.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3 text-xs text-surface-400">{h.date}</td>
                    <td className="px-5 py-3 font-medium text-surface-700">{h.member}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full ${h.type === 'earned' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                        {h.type === 'earned' ? '+' : '−'} {h.type.charAt(0).toUpperCase() + h.type.slice(1)}
                      </span>
                    </td>
                    <td className={`px-5 py-3 font-semibold ${h.points > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                      {h.points > 0 ? '+' : ''}{h.points}
                    </td>
                    <td className="px-5 py-3 text-surface-500 text-xs">{h.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Referrals Tab */}
      {view === 'referrals' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardBody className="text-center py-6">
                <p className="text-3xl font-bold text-primary-600">{totalReferrals}</p>
                <p className="text-xs text-surface-400 mt-1">Total Referrals</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center py-6">
                <p className="text-3xl font-bold text-green-600">{referralLog.filter(r => r.status === 'converted').length}</p>
                <p className="text-xs text-surface-400 mt-1">Converted</p>
              </CardBody>
            </Card>
            <Card>
              <CardBody className="text-center py-6">
                <p className="text-3xl font-bold text-amber-600">{referralLog.filter(r => r.status === 'pending').length}</p>
                <p className="text-xs text-surface-400 mt-1">Pending</p>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-surface-700">Referral Log</h2>
                <Button size="sm" onClick={() => setShowReferral(true)}><Plus size={14} /> Record Referral</Button>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-100 text-left">
                    <th className="px-5 py-3 font-medium text-surface-500">Date</th>
                    <th className="px-5 py-3 font-medium text-surface-500">Referrer</th>
                    <th className="px-5 py-3 font-medium text-surface-500">New Customer</th>
                    <th className="px-5 py-3 font-medium text-surface-500">Status</th>
                    <th className="px-5 py-3 font-medium text-surface-500">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {referralLog.map(r => (
                    <tr key={r.id} className="border-b border-surface-50 hover:bg-surface-50/50 transition-colors">
                      <td className="px-5 py-3 text-xs text-surface-400">{r.date}</td>
                      <td className="px-5 py-3 font-medium text-surface-700">{r.referrer}</td>
                      <td className="px-5 py-3 text-surface-600">{r.newCustomer}</td>
                      <td className="px-5 py-3"><Badge status={r.status === 'converted' ? 'completed' : 'pending'} /></td>
                      <td className="px-5 py-3 text-xs text-surface-500">{r.reward}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Top Referrers */}
          <Card>
            <CardHeader><h2 className="text-base font-semibold text-surface-700">Top Referrers</h2></CardHeader>
            <CardBody className="space-y-2">
              {[...members].sort((a, b) => b.referrals - a.referrals).filter(m => m.referrals > 0).map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface-50/50 border border-surface-100">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-surface-100 text-surface-600' : 'bg-amber-50 text-amber-700'}`}>
                    #{i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-surface-700">{m.name}</p>
                    <p className="text-xs text-surface-400">{m.referrals} referrals</p>
                  </div>
                  <span className="text-sm font-semibold text-primary-600">+{m.referrals * 150} pts</span>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      )}

      {/* Automated Reminders Tab */}
      {view === 'reminders' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openAddReminder}><Plus size={16} /> Add Reminder</Button>
          </div>
          <div className="space-y-3">
            {reminders.map(r => (
              <Card key={r.id} className={!r.active ? 'opacity-60' : ''}>
                <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${r.active ? r.channel === 'whatsapp' ? 'bg-green-50 text-green-600' : 'bg-blue-50 text-blue-600' : 'bg-surface-100 text-surface-400'}`}>
                      {r.channel === 'whatsapp' ? <MessageSquare size={18} /> : <Send size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-surface-700">{r.name}</h3>
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${r.channel === 'whatsapp' ? 'bg-green-50 text-green-600 border border-green-200' : 'bg-blue-50 text-blue-600 border border-blue-200'}`}>
                          {r.channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
                        </span>
                      </div>
                      <p className="text-xs text-surface-400 mt-0.5">Trigger: {REMINDER_TRIGGERS.find(t => t.value === r.trigger)?.label || r.trigger}</p>
                      <div className="mt-2 p-2.5 rounded-lg bg-surface-50 border border-surface-100">
                        <p className="text-xs text-surface-500 leading-relaxed">{r.template}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => toggleReminder(r.id)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${r.active ? 'bg-primary-400' : 'bg-surface-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${r.active ? 'translate-x-5' : ''}`} />
                    </button>
                    <Button variant="ghost" size="sm" onClick={() => openEditReminder(r)}><Edit2 size={14} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteReminder(r.id)}><Trash2 size={14} className="text-danger-500" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Rule Modal */}
      <Modal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} title={editingRule ? 'Edit Rule' : 'Add Reward Rule'} size="md">
        <form onSubmit={saveRule} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Rule Name *</label>
            <input required value={ruleForm.name} onChange={e => setRuleForm({...ruleForm, name: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Trigger *</label>
            <select value={ruleForm.trigger} onChange={e => setRuleForm({...ruleForm, trigger: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
              {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {ruleForm.trigger === 'visit_count' && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Visit Count</label>
              <input type="number" min={1} value={ruleForm.visitCount} onChange={e => setRuleForm({...ruleForm, visitCount: Number(e.target.value)})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
          )}
          {ruleForm.trigger === 'spend_milestone' && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Spend Amount ({'\u20B9'})</label>
              <input type="number" min={100} value={ruleForm.spendAmount} onChange={e => setRuleForm({...ruleForm, spendAmount: Number(e.target.value)})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Reward Description *</label>
            <input required value={ruleForm.reward} onChange={e => setRuleForm({...ruleForm, reward: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Bonus Points</label>
            <input type="number" min={0} value={ruleForm.points} onChange={e => setRuleForm({...ruleForm, points: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowRuleModal(false)}>Cancel</Button>
            <Button type="submit">{editingRule ? 'Save Changes' : 'Add Rule'}</Button>
          </div>
        </form>
      </Modal>

      {/* Record Referral Modal */}
      <Modal isOpen={showReferral} onClose={() => setShowReferral(false)} title="Record Referral" size="sm">
        <form onSubmit={recordReferral} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Referring Member *</label>
            <select required value={refForm.referrer} onChange={e => setRefForm({...refForm, referrer: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">New Customer Name *</label>
            <input required value={refForm.newCustomer} onChange={e => setRefForm({...refForm, newCustomer: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">New Customer Phone</label>
            <input value={refForm.phone} onChange={e => setRefForm({...refForm, phone: e.target.value})} placeholder="e.g. 9876543210"
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowReferral(false)}>Cancel</Button>
            <Button type="submit">Record Referral</Button>
          </div>
        </form>
      </Modal>

      {/* Reminder Modal */}
      <Modal isOpen={showReminderModal} onClose={() => setShowReminderModal(false)} title={editingReminder ? 'Edit Reminder' : 'Add Automated Reminder'} size="md">
        <form onSubmit={saveReminder} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Name *</label>
            <input required value={reminderForm.name} onChange={e => setReminderForm({...reminderForm, name: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" placeholder="e.g. Follow-up after 7 days" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Trigger *</label>
              <select value={reminderForm.trigger} onChange={e => setReminderForm({...reminderForm, trigger: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                {REMINDER_TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Channel *</label>
              <select value={reminderForm.channel} onChange={e => setReminderForm({...reminderForm, channel: e.target.value})}
                className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200">
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Message Template *</label>
            <textarea required rows={3} value={reminderForm.template} onChange={e => setReminderForm({...reminderForm, template: e.target.value})}
              className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200" placeholder="Use {{name}}, {{time}}, {{service}}, {{points}} as placeholders" />
            <p className="text-[10px] text-surface-400 mt-1">Variables: {'{{name}}'}, {'{{time}}'}, {'{{service}}'}, {'{{points}}'}, {'{{date}}'}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowReminderModal(false)}>Cancel</Button>
            <Button type="submit">{editingReminder ? 'Save Changes' : 'Add Reminder'}</Button>
          </div>
        </form>
      </Modal>

      {/* WhatsApp Send Modal */}
      <WhatsAppSendModal
        isOpen={waModal.open}
        onClose={() => setWaModal({ open: false, customer: null, vars: {} })}
        customer={waModal.customer}
        template="loyalty"
        templateVars={waModal.vars}
      />
    </div>
  );
}
