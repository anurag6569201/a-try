import { clsx } from 'clsx';

interface Props {
  className?: string;
  children: React.ReactNode;
  dot?: string;
}

export function Badge({ className, children, dot }: Props) {
  return (
    <span className={clsx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', className)}>
      {dot && <span className={clsx('w-1.5 h-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}
