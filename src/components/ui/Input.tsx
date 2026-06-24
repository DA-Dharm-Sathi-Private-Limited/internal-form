import { InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, className = '', ...rest }, ref) => (
    <div className="form-group">
      {label && <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1.5 text-sm">{label}</label>}
      <input ref={ref} className={`form-input ${className}`} {...rest} />
    </div>
  )
);
Input.displayName = 'Input';
