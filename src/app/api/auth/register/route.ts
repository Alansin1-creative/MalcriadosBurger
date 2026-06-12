import { NextResponse } from 'next/server';

/** Registro directo deshabilitado — usar /api/auth/register/start + verify */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message: 'Debes verificar tu correo y celular. Usa el formulario de registro actualizado.',
    },
    { status: 400 }
  );
}
