export type PasswordCheck = {
  id: string;
  label: string;
  passed: boolean;
};

const COMMON_PASSWORDS = new Set(
  [
    'password',
    'password123',
    '12345678',
    '123456789',
    'qwerty123',
    'admin123',
    'malcriados',
    'burger123',
    'contraseña',
    'contrasena',
  ].map((p) => p.toLowerCase())
);

export function analyzePassword(password: string): PasswordCheck[] {
  return [
    { id: 'length', label: 'Mínimo 10 caracteres', passed: password.length >= 10 },
    { id: 'lower', label: 'Una letra minúscula', passed: /[a-z]/.test(password) },
    { id: 'upper', label: 'Una letra mayúscula', passed: /[A-Z]/.test(password) },
    { id: 'digit', label: 'Un número', passed: /\d/.test(password) },
    {
      id: 'special',
      label: 'Un símbolo (!@#$%…)',
      passed: /[^A-Za-z0-9]/.test(password),
    },
    {
      id: 'common',
      label: 'No es una contraseña común',
      passed: !COMMON_PASSWORDS.has(password.toLowerCase()),
    },
  ];
}

export function isPasswordStrong(password: string): boolean {
  return analyzePassword(password).every((c) => c.passed);
}

export function validatePassword(password: string): string | null {
  const checks = analyzePassword(password);
  const failed = checks.find((c) => !c.passed);
  if (!failed) return null;
  return `Contraseña débil: ${failed.label.toLowerCase()}`;
}
