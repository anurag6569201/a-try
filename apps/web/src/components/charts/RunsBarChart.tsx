import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

interface DayData { day: string; passed: number; failed: number; count: number }

interface Props { data: DayData[] }

export function RunsBarChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          cursor={{ fill: '#f9fafb' }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="passed" name="Passed" fill="#22c55e" radius={[2, 2, 0, 0]} stackId="a" />
        <Bar dataKey="failed" name="Failed" fill="#ef4444" radius={[2, 2, 0, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}
