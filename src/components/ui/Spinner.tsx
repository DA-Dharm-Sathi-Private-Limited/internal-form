interface Props {
  text?: string;
}

export function Spinner({ text = 'Loading...' }: Props) {
  return (
    <div className="py-16 text-center text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#16161f] rounded-xl border border-dashed border-gray-200 dark:border-[#2a2a38] animate-pulse">
      <div className="btn-spinner border-[3px] border-accent border-t-transparent rounded-full w-10 h-10 mx-auto mb-4"></div>
      <p className="font-medium">{text}</p>
    </div>
  );
}
