import { clsx } from 'clsx';

interface Props { className?: string; children: React.ReactNode; }

export function Card({ className, children }: Props) {
  return (
    <div className={clsx('bg-white border border-gray-100 rounded-xl shadow-card', className)}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children }: Props) {
  return <div className={clsx('px-5 py-3.5 border-b border-gray-100', className)}>{children}</div>;
}

export function CardBody({ className, children }: Props) {
  return <div className={clsx('px-5 py-4', className)}>{children}</div>;
}
