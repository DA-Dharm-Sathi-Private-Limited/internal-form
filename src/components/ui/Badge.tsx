interface Props {
  children: string;
  variant?: 'indigo' | 'emerald' | 'pink';
}

const colors: Record<string, string> = {
  indigo: 'badge badge-indigo',
  emerald: 'badge badge-emerald',
  pink: 'bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-400',
};

export function Badge({ children, variant = 'indigo' }: Props) {
  return <span className={colors[variant] || colors.indigo}>{children}</span>;
}
