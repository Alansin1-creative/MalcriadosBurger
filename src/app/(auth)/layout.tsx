import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-screen bg-diner-bg text-cream antialiased"
      style={{ backgroundColor: '#1a120c', color: '#fff4e0' }}>
      <div className="diner-awning" />
      {children}
    </div>
  );
}
