export default function StatCard({ icon: Icon, label, value, change, changeType = 'neutral' }) {
  const changeColors = {
    up: 'text-success-600',
    down: 'text-danger-600',
    neutral: 'text-surface-500',
  };

  return (
    <div className="bg-white rounded-xl border border-surface-100 shadow-card p-3 sm:p-5 hover:shadow-card-hover transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs sm:text-sm text-surface-500 font-medium">{label}</p>
          <p className="text-lg sm:text-2xl font-bold text-surface-800 mt-1">{value}</p>
          {change && (
            <p className={`text-xs mt-1 ${changeColors[changeType]}`}>{change}</p>
          )}
        </div>
        {Icon && (
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-primary-50 flex items-center justify-center">
            <Icon size={20} className="text-primary-500" />
          </div>
        )}
      </div>
    </div>
  );
}
