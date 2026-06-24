import { ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  message: string;
  onDismiss?: () => void;
}

export function ErrorBox({ children, message, onDismiss }: Props) {
  if (!message) return <>{children}</>;
  return (
    <>
      <div className="form-error">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
        <span className="flex-1">{message}</span>
        {onDismiss && (
          <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600 ml-2">&times;</button>
        )}
      </div>
      {children}
    </>
  );
}
