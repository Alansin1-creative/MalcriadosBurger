'use client';

import { analyzePassword } from '@/lib/auth/password-policy';

export function PasswordStrength({ password }: { password: string }) {
  const checks = analyzePassword(password);
  const passed = checks.filter((c) => c.passed).length;
  const strength =
    password.length === 0
      ? 0
      : passed <= 2
        ? 1
        : passed <= 4
          ? 2
          : passed <= 5
            ? 3
            : 4;

  const barColors = ['bg-food-border', 'bg-ketchup', 'bg-mustard', 'bg-mustard-light', 'bg-emerald-500'];
  const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded-full transition-colors ${
              strength >= level ? barColors[strength] : 'bg-food-border'
            }`}
          />
        ))}
      </div>
      {password.length > 0 && (
        <p className="text-[10px] text-food-muted">
          Seguridad: <span className="text-cream/90">{labels[strength]}</span>
        </p>
      )}
      <ul className="space-y-0.5 text-[10px]">
        {checks.map((c) => (
          <li key={c.id} className={c.passed ? 'text-emerald-400' : 'text-food-muted'}>
            {c.passed ? '✓' : '○'} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
