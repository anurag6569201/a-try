import { clsx } from 'clsx';

interface Props {
  value: number;
  max: number;
  label?: string;
}

export function UsageBar({ value, max, label }: Props) {
  const pct = Math.min(100, max > 0 ? Math.round((value / max) * 100) : 0);
  const fillColor = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-400' : 'bg-brand-500';

  return (
    <div className="space-y-1">
      {label && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>{label}</span>
          <span className={clsx(pct >= 90 && 'text-red-600 font-medium')}>{value} / {max}</span>
        </div>
      )}
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-500', fillColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
