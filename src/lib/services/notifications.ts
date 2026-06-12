type SendResult = { ok: true } | { ok: false; message: string };

function devFallbackEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.DEV_VERIFICATION_FALLBACK === '1';
}

export async function sendEmailVerificationCode(
  email: string,
  code: string,
  name: string
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Malcriados <onboarding@resend.dev>';

  if (!apiKey) {
    if (devFallbackEnabled()) {
      console.log(`[dev] Código email para ${email}: ${code}`);
      return { ok: true };
    }
    return {
      ok: false,
      message: 'Servicio de correo no configurado (RESEND_API_KEY)',
    };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [email],
      subject: 'Código de verificación — Malcriados',
      html: `
        <p>Hola ${name},</p>
        <p>Tu código para crear cuenta en Malcriados Burger & Dogos es:</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
        <p>Válido por 10 minutos. Si no solicitaste esto, ignora este mensaje.</p>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[email] Resend error:', err);
    return { ok: false, message: 'No se pudo enviar el correo de verificación' };
  }
  return { ok: true };
}

export async function sendPhoneVerificationPin(
  phoneE164: string,
  pin: string
): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    if (devFallbackEnabled()) {
      console.log(`[dev] NIP SMS para ${phoneE164}: ${pin}`);
      return { ok: true };
    }
    return {
      ok: false,
      message: 'Servicio SMS no configurado (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)',
    };
  }

  const body = new URLSearchParams({
    To: phoneE164,
    From: from,
    Body: `Malcriados: tu NIP de verificación es ${pin}. Válido 10 min. No lo compartas.`,
  });

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[sms] Twilio error:', err);
    return { ok: false, message: 'No se pudo enviar el SMS con el NIP' };
  }
  return { ok: true };
}

export function getDevVerificationHint(): boolean {
  return devFallbackEnabled();
}
