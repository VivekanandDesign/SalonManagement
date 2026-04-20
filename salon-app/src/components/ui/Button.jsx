const variants = {
  primary:
    'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-200',
  secondary:
    'bg-surface-100 text-surface-700 hover:bg-surface-200 focus:ring-surface-200',
  outline:
    'bg-white text-surface-700 border border-surface-200 hover:bg-surface-50 focus:ring-primary-100',
  danger:
    'bg-danger-500 text-white hover:bg-danger-600 focus:ring-danger-200',
  ghost:
    'text-surface-500 hover:bg-surface-50 hover:text-surface-700 focus:ring-surface-100',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium rounded-lg
        transition-all duration-150 focus:outline-none focus:ring-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
}
