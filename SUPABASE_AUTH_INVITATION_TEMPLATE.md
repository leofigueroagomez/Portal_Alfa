# Supabase Auth invitation template - Portal Cliente ALFA

Configurar en Supabase Dashboard:

Auth > Email Templates > Invite user

## Subject

```text
Bienvenido al Portal de Cliente ALFA IT
```

## Body

Usar `{{ .ConfirmationURL }}` como URL del boton o enlace principal. Supabase reemplaza ese valor con el link firmado de invitacion.

```html
<p>Hola,</p>

<p>ALFA IT te ha creado acceso a tu Portal de Cliente.</p>

<p>
  Desde este portal podras consultar tus proyectos, entregas, garantias,
  facturas, pagos y documentos relacionados con los servicios contratados.
</p>

<p>Para activar tu cuenta, haz clic en el siguiente boton:</p>

<p>
  <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#9E1B32;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:6px;font-weight:600;">
    Activar cuenta
  </a>
</p>

<p>Si el boton no funciona, copia y pega este enlace en tu navegador:</p>
<p>{{ .ConfirmationURL }}</p>

<p>Si no esperabas esta invitacion, puedes ignorar este correo.</p>

<p>
  ALFA IT<br />
  Tecnologia bien implementada. Experiencias bien ejecutadas.
</p>
```

## Redirect URL

La aplicacion envia invitaciones con:

```text
{APP_URL}/auth/accept-invite
```

Agregar esa URL en Supabase Auth > URL Configuration > Redirect URLs.

Ejemplo:

```text
https://portal.alfait.com.mx/auth/accept-invite
```

## Branding / sender

Revisar en Supabase Auth:

- Sender name: `ALFA IT`
- Sender email ideal: `soporte@alfait.com.mx` o `no-reply@alfait.com.mx`

Limitacion: si el plan/proyecto de Supabase no permite SMTP personalizado, el correo puede seguir saliendo con remitente de Supabase Auth aunque el template este personalizado. Para experiencia premium consistente, configurar SMTP propio o un proveedor transaccional como Resend.
