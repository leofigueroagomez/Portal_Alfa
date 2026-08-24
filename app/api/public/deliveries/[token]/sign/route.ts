import { NextResponse } from "next/server";
import { checkBasicRateLimit, createRequestId, getClientIp, logApiError } from "@/lib/apiAuth";
import { submitDeliverySignature } from "@/lib/projectDeliverySignature";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const requestId = createRequestId();
  const { token } = await params;
  const clientIp = getClientIp(request);
  const userAgent = request.headers.get("user-agent");

  const rateLimitKey = `public-delivery-sign:${token}:${clientIp}`;
  if (!checkBasicRateLimit(rateLimitKey, 10, 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Intenta más tarde.", requestId }, { status: 429 });
  }

  try {
    const body = await request.json();
    const {
      signatureDataUrl,
      signerName,
      signerRole,
      signerEmail,
      signerPhone,
      ineFrontDataUrl,
      ineBackDataUrl,
      geolocation,
      privacyConsentAccepted,
    } = body || {};

    if (!signatureDataUrl || typeof signatureDataUrl !== "string" || !signatureDataUrl.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "La firma digital es requerida en formato de imagen válido." },
        { status: 400 }
      );
    }

    if (!signerName || typeof signerName !== "string" || !signerName.trim()) {
      return NextResponse.json(
        { error: "El nombre del cliente o firmante es obligatorio." },
        { status: 400 }
      );
    }

    if (!signerEmail || typeof signerEmail !== "string" || !signerEmail.includes("@")) {
      return NextResponse.json(
        { error: "Un correo electrónico válido es obligatorio para el envío de su carta de garantía y avisos." },
        { status: 400 }
      );
    }

    if (!signerPhone || typeof signerPhone !== "string" || signerPhone.trim().length < 8) {
      return NextResponse.json(
        { error: "Un teléfono móvil / WhatsApp válido es obligatorio para el envío de su garantía." },
        { status: 400 }
      );
    }

    if (!privacyConsentAccepted) {
      return NextResponse.json(
        { error: "Es necesario aceptar el consentimiento de privacidad y tratamiento de datos." },
        { status: 400 }
      );
    }

    const result = await submitDeliverySignature({
      token,
      signatureDataUrl,
      signerName: signerName.trim(),
      signerRole: typeof signerRole === "string" ? signerRole.trim() : null,
      signerEmail: signerEmail.trim(),
      signerPhone: signerPhone.trim(),
      ineFrontDataUrl: typeof ineFrontDataUrl === "string" ? ineFrontDataUrl : null,
      ineBackDataUrl: typeof ineBackDataUrl === "string" ? ineBackDataUrl : null,
      geolocation: geolocation && typeof geolocation.latitude === "number" && typeof geolocation.longitude === "number"
        ? {
            latitude: geolocation.latitude,
            longitude: geolocation.longitude,
            accuracy: typeof geolocation.accuracy === "number" ? geolocation.accuracy : null,
            timestamp: geolocation.timestamp || null,
          }
        : null,
      privacyConsentAccepted: Boolean(privacyConsentAccepted),
      ip: clientIp,
      userAgent,
      request,
    });

    return NextResponse.json({
      success: true,
      deliveryId: result.deliveryId,
      projectId: result.projectId,
      signedAt: result.signedAt,
      signerName: result.signerName,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error procesando firma digital.";
    logApiError(requestId, "delivery remote signature failed", error);
    return NextResponse.json({ error: message, requestId }, { status: 400 });
  }
}
