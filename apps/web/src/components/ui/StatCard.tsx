import { clsx } from 'clsx';
import { Card } from './Card.js';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, sub, icon, className }: Props) {
  return (
    <Card className={clsx('p-5', className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-500">{sub}</p>}
        </div>
        {icon && <div className="text-brand-600 opacity-80">{icon}</div>}
      </div>
    </Card>
  );
}
