export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
          <Icon size={28} className="text-primary-400" />
        </div>
      )}
      <h3 className="text-base font-semibold text-surface-700">{title}</h3>
      {description && (
        <p className="text-sm text-surface-400 mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
