import { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'submit' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'btn btn-primary',
  secondary: 'btn btn-secondary',
  submit: 'btn btn-submit',
  ghost: 'text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a38] rounded-xl transition-colors',
  danger: 'text-xs px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 font-medium hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({ variant = 'primary', loading, children, className = '', disabled, ...rest }: Props) {
  return (
    <button
      className={`${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <><span className="btn-spinner border-2 border-white border-t-transparent inline-block w-4 h-4 mr-2"></span> Processing...</> : children}
    </button>
  );
}
