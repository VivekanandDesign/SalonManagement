import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-white rounded-t-xl sm:rounded-xl shadow-xl border border-surface-100 w-full ${widths[size]} max-h-[85vh] sm:max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-surface-100">
          <h2 className="text-sm sm:text-base font-semibold text-surface-800">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {children}
        </div>
      </div>
    </div>
  );
}
