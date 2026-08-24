import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ShieldCheck, ArrowLeft, Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Aviso de Privacidad | ALFA High End Services",
  description:
    "Aviso de privacidad integral de ALFA High End Services conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.",
  alternates: {
    canonical: "/aviso-de-privacidad",
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[#0F0F0F] text-white">
      {/* Header Bar */}
      <header className="border-b border-white/10 px-5 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-alfa.png"
              alt="ALFA High End Services"
              width={140}
              height={70}
              priority
              className="h-10 w-auto object-contain"
            />
            <span className="hidden text-xs font-semibold uppercase tracking-[0.24em] text-zinc-300 sm:block">
              High End Services
            </span>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <article className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-20 lg:px-12">
        <div className="mb-12 border-b border-white/10 pb-8">
          <p className="inline-flex items-center gap-2 border border-[#B84A5A]/40 bg-[#7A1F2B]/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-[#F0B8C0]">
            <ShieldCheck className="h-4 w-4" />
            Cumplimiento Legal
          </p>
          <h1 className="mt-6 text-3xl font-semibold leading-tight text-white sm:text-4xl lg:text-5xl">
            Aviso de Privacidad Integral
          </h1>
          <p className="mt-4 text-sm text-zinc-400">
            Última actualización: Agosto 2026 | Conforme a la Ley Federal de
            Protección de Datos Personales en Posesión de los Particulares
            (LFPDPPP).
          </p>
        </div>

        <div className="space-y-10 text-sm leading-8 text-zinc-300 sm:text-base">
          {/* Section 1 */}
          <section>
            <h2 className="text-xl font-semibold text-white">
              1. Identidad y Domicilio del Responsable
            </h2>
            <p className="mt-3">
              <strong className="text-white">ALFA High End Services</strong> (en
              lo sucesivo &ldquo;ALFA&rdquo;), con domicilio fiscal y operativo
              en Zapopan, Jalisco, México, es responsable del tratamiento legítimo,
              controlado e informado de sus datos personales, en estricto apego a
              los principios de licitud, consentimiento, información, calidad,
              finalidad, lealtad, proporcionalidad y responsabilidad.
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-xl font-semibold text-white">
              2. Datos Personales que Recabamos
            </h2>
            <p className="mt-3">
              Para llevar a cabo las finalidades descritas en el presente aviso,
              recabamos los siguientes datos de identificación y contacto
              proporcionados voluntariamente a través de nuestros formularios web,
              canales de WhatsApp o atención directa:
            </p>
            <ul className="mt-3 list-inside list-disc space-y-1 text-zinc-300">
              <li>Nombre completo y/o razón social.</li>
              <li>Número de teléfono de contacto y/o WhatsApp.</li>
              <li>Correo electrónico institucional o personal.</li>
              <li>
                Empresa, negocio o ubicación aproximada del inmueble a intervenir.
              </li>
              <li>
                Requerimientos técnicos del proyecto (audio/video, redes, CCTV,
                automatización o control de acceso) y presupuesto estimado.
              </li>
            </ul>
            <p className="mt-3 text-xs text-zinc-400">
              * ALFA no solicita ni recaba datos personales sensibles (como
              origen racial, estado de salud o ideología religiosa) a través de
              su sitio web.
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-xl font-semibold text-white">
              3. Finalidades del Tratamiento de Datos
            </h2>
            <p className="mt-3">
              Los datos personales recabados serán utilizados para las siguientes{" "}
              <strong className="text-white">finalidades primarias</strong> y
              necesarias para el servicio:
            </p>
            <ol className="mt-3 list-inside list-decimal space-y-1 text-zinc-300">
              <li>
                Elaboración de diagnósticos técnicos, propuestas económicas y
                cotizaciones de integración tecnológica.
              </li>
              <li>
                Contacto directo para dar seguimiento a solicitudes comerciales y
                coordinación de visitas técnicas de levantamiento.
              </li>
              <li>
                Gestión, ejecución y entrega documentada de proyectos a través de
                nuestra plataforma ALFA OS.
              </li>
              <li>
                Cumplimiento de obligaciones fiscales, contractuales y de
                facturación (CFDI).
              </li>
            </ol>
            <p className="mt-4">
              De manera adicional, utilizaremos su información para las siguientes{" "}
              <strong className="text-white">finalidades secundarias</strong>:
              evaluación de la calidad en el servicio y envío de comunicaciones
              informativas sobre novedades tecnológicas o mantenimiento de
              sistemas instalados.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-xl font-semibold text-white">
              4. Transferencia y Protección de Datos
            </h2>
            <p className="mt-3">
              ALFA no vende, alquila ni transfiere sus datos personales a
              terceros ajenos a la prestación del servicio sin su consentimiento
              expreso, salvo las excepciones previstas por el artículo 37 de la
              LFPDPPP (tales como autoridades fiscales o judiciales competentes).
            </p>
            <p className="mt-3">
              Implementamos medidas de seguridad administrativas, técnicas y
              físicas con altos estándares de la industria para proteger sus datos
              contra daño, pérdida, alteración, destrucción o uso no autorizado.
            </p>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-xl font-semibold text-white">
              5. Derechos ARCO (Acceso, Rectificación, Cancelación y Oposición)
            </h2>
            <p className="mt-3">
              Usted tiene derecho a conocer qué datos personales tenemos de
              usted, para qué los utilizamos y las condiciones del uso que les
              damos (Acceso). Asimismo, tiene derecho a solicitar la corrección
              de su información (Rectificación), que la eliminemos de nuestros
              registros cuando considere que no está siendo utilizada
              adecuadamente (Cancelación), o a oponerse al tratamiento de los
              mismos para fines específicos (Oposición).
            </p>
            <p className="mt-3">
              Para ejercer cualquiera de sus derechos ARCO o revocar su
              consentimiento, envíe una solicitud por escrito al correo
              electrónico:{" "}
              <a
                href="mailto:contacto@alfait.com.mx"
                className="text-[#F0B8C0] underline hover:text-white"
              >
                contacto@alfait.com.mx
              </a>
              , especificando su nombre, copia de identificación oficial y el
              derecho que desea ejercer.
            </p>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-xl font-semibold text-white">
              6. Uso de Cookies y Tecnologías de Rastreo
            </h2>
            <p className="mt-3">
              Nuestro sitio web puede utilizar cookies, web beacons y
              herramientas de analítica con la finalidad de optimizar la
              experiencia de navegación, recordar preferencias y medir el
              rendimiento del sitio. Puede deshabilitar el uso de cookies
              directamente en la configuración de su navegador web.
            </p>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-xl font-semibold text-white">
              7. Cambios al Aviso de Privacidad
            </h2>
            <p className="mt-3">
              El presente aviso de privacidad puede sufrir modificaciones,
              cambios o actualizaciones derivadas de requerimientos legales o de
              nuestras propias prácticas de privacidad. Cualquier modificación
              será publicada y estará siempre disponible en esta misma página
              web:{" "}
              <Link
                href="/aviso-de-privacidad"
                className="text-[#F0B8C0] underline hover:text-white"
              >
                https://www.alfait.com.mx/aviso-de-privacidad
              </Link>
              .
            </p>
          </section>

          {/* Contact Box */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
            <h3 className="text-lg font-semibold text-white">
              Dudas o aclaraciones sobre privacidad
            </h3>
            <p className="mt-2 text-sm text-zinc-300">
              Si tiene alguna pregunta sobre este Aviso de Privacidad o sobre el
              tratamiento de sus datos personales, puede comunicarse con nuestro
              equipo:
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3 text-xs sm:text-sm">
              <div className="flex items-center gap-3 text-zinc-300">
                <MapPin className="h-5 w-5 text-[#B84A5A] shrink-0" />
                <span>Zapopan, Jalisco, México</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-300">
                <Mail className="h-5 w-5 text-[#B84A5A] shrink-0" />
                <a
                  href="mailto:contacto@alfait.com.mx"
                  className="hover:text-white transition"
                >
                  contacto@alfait.com.mx
                </a>
              </div>
              <div className="flex items-center gap-3 text-zinc-300">
                <Phone className="h-5 w-5 text-[#B84A5A] shrink-0" />
                <span>ALFA High End Services</span>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-zinc-500 sm:px-8">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} ALFA High End Services. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-zinc-300 transition">
              Inicio
            </Link>
            <Link href="/servicios/audio-video" className="hover:text-zinc-300 transition">
              Servicios
            </Link>
            <Link href="/login" className="hover:text-zinc-300 transition">
              Portal
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
