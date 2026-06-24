import { SelectHTMLAttributes } from 'react';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ label, options, placeholder, className = '', ...rest }: Props) {
  return (
    <div className="form-group">
      {label && <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1.5 text-sm">{label}</label>}
      <select className={`form-input ${className}`} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
