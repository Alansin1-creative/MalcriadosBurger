export function StatCard({
  label,
  value,
  sub,
  accent = 'mustard',
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: 'mustard' | 'ketchup' | 'cream' | 'green';
}) {
  const colors = {
    mustard: 'border-mustard/40 bg-mustard/10 text-mustard-light',
    ketchup: 'border-ketchup/40 bg-ketchup/15 text-cream',
    cream: 'border-food-border bg-diner-card text-cream',
    green: 'border-emerald-600/40 bg-emerald-900/20 text-emerald-200',
  };

  return (
    <div className={`food-panel border p-5 ${colors[accent]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-90">{label}</p>
      <p className="font-display mt-2 text-2xl font-bold text-cream">{value}</p>
      {sub && <p className="mt-1 text-sm opacity-75">{sub}</p>}
    </div>
  );
}
