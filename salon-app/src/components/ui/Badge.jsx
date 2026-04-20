const statusStyles = {
  booked: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-violet-50 text-violet-700 border-violet-200',
  'in-progress': 'bg-amber-50 text-amber-700 border-amber-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  'no-show': 'bg-red-50 text-red-700 border-red-200',
  cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
  new: 'bg-primary-50 text-primary-700 border-primary-200',
  regular: 'bg-accent-50 text-accent-700 border-accent-200',
  vip: 'bg-amber-50 text-amber-700 border-amber-200',
  inactive: 'bg-surface-100 text-surface-500 border-surface-200',
  active: 'bg-green-50 text-green-700 border-green-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  delivered: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  // Lead stages
  enquiry: 'bg-slate-50 text-slate-600 border-slate-200',
  cold: 'bg-sky-50 text-sky-700 border-sky-200',
  warm: 'bg-amber-50 text-amber-700 border-amber-200',
  hot: 'bg-orange-50 text-orange-700 border-orange-200',
  converted: 'bg-green-50 text-green-700 border-green-200',
  loyal: 'bg-purple-50 text-purple-700 border-purple-200',
  champion: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  lost: 'bg-gray-100 text-gray-500 border-gray-300',
};

export default function Badge({ status, label, className = '' }) {
  const display = label || status;
  const style = statusStyles[status] || 'bg-surface-100 text-surface-600 border-surface-200';

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${style} ${className}`}
    >
      {display.charAt(0).toUpperCase() + display.slice(1).replace('-', ' ')}
    </span>
  );
}
