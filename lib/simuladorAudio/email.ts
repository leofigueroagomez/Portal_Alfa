import "server-only";

/** Correo con el codigo de verificacion del simulador de audio (Resend). */
export async function sendSimulatorCodeEmail(input: {
  to: string;
  name: string;
  code: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "ALFA IT <direccion@alfait.com.mx>";

  if (!apiKey) return false;

  const firstName = escapeHtml(input.name.split(/\s+/)[0] || "");
  const greeting = firstName ? `Hola, ${firstName}.` : "Hola.";

  const html = `<!DOCTYPE html>
<html lang="es">
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:32px 16px;background:#F7F6F3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111111;">
    <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border:1px solid #E5E3DD;border-radius:16px;overflow:hidden;">
      <div style="padding:28px 32px 0 32px;">
        <div style="font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#9E1B32;">ALFA High End Services</div>
        <h1 style="margin:14px 0 0 0;font-size:22px;font-weight:600;">Tu código para el simulador de audio</h1>
      </div>
      <div style="padding:20px 32px 32px 32px;font-size:15px;line-height:1.6;color:#44464C;">
        <p style="margin:0 0 20px 0;">${greeting} Escribe este código en la página del simulador para entrar:</p>
        <div style="font-size:34px;font-weight:700;letter-spacing:10px;text-align:center;color:#111111;background:#F7F6F3;border-radius:12px;padding:18px 0;">${input.code}</div>
        <p style="margin:20px 0 0 0;font-size:13px;color:#77797F;">El código vence en 15 minutos. Si no lo pediste, ignora este correo.</p>
      </div>
    </div>
  </body>
</html>`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: `${input.code} es tu código del simulador de audio de ALFA`,
        html,
        text: `${greeting} Tu código para el simulador de audio de ALFA es ${input.code}. Vence en 15 minutos. Si no lo pediste, ignora este correo.`,
      }),
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .slice(0, 60);
}
