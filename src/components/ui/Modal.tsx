import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  title: string;
  icon?: string;
  onClose: () => void;
  wide?: boolean;
}

export function Modal({ children, title, icon, onClose, wide }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white dark:bg-[#16161f] rounded-2xl shadow-xl w-full p-6 border border-gray-200 dark:border-[#2a2a38] animate-in slide-in-from-bottom-4 zoom-in-95 duration-200 ${wide ? 'max-w-2xl' : 'max-w-md'}`}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            {icon && <span className="text-lg">{icon}</span>}
            {title}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
