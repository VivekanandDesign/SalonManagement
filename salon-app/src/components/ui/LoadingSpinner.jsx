import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 ${className}`}>
      <Loader2 size={32} className="animate-spin text-primary-500 mb-3" />
      <p className="text-sm text-surface-400">{message}</p>
    </div>
  );
}
