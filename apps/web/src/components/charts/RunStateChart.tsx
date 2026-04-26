import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Run } from '../../types/index.js';
import { STATE_META } from '../../lib/utils.js';

const COLORS: Record<string, string> = {
  completed: '#22c55e', failed: '#ef4444', canceled: '#9ca3af',
  running: '#3b82f6', queued: '#d1d5db', blocked_environment: '#f97316',
  waiting_for_preview: '#f59e0b', planning: '#60a5fa',
  analyzing: '#a78bfa', reporting: '#818cf8', needs_human: '#facc15',
};

interface Props { runs: Run[] }

export function RunStateChart({ runs }: Props) {
  const counts: Record<string, number> = {};
  for (const r of runs) {
    counts[r.state] = (counts[r.state] ?? 0) + 1;
  }

  const data = Object.entries(counts).map(([state, value]) => ({
    name: STATE_META[state as keyof typeof STATE_META]?.label ?? state,
    value,
    state,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={80} labelLine={false}>
          {data.map((entry) => (
            <Cell key={entry.state} fill={COLORS[entry.state] ?? '#d1d5db'} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number, name: string) => [v, name]} />
        <Legend iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
