import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4px)] items-center justify-center text-food-muted">
          Cargando…
        </div>
      }>
      <LoginForm />
    </Suspense>
  );
}
