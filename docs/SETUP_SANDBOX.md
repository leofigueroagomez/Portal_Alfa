# ALFA OS Sandbox / Staging Setup

This guide prepares a non-production ALFA OS environment connected to a dedicated Supabase sandbox. Do not reuse production secrets, production Supabase URLs, production Facturama credentials, or production Resend/WhatsApp credentials.

## Current Configuration Inventory

The app is a Next.js 16 project with Supabase SSR/browser clients and several server-side integrations.

- `package.json`: main scripts are `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, and `npm run sat:import`.
- `next.config.ts`: no custom runtime config.
- `services/supabase.ts`: browser client uses `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `services/supabaseServer.ts`: server/session client uses the same public Supabase URL/key with cookies.
- `services/supabaseAdmin.ts`: service role client uses `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
- `lib/facturama.ts`: Facturama environment is selected by `FACTURAMA_ENV`; production stamping is additionally gated by `FACTURAMA_ENABLE_PRODUCTION=true`.
- `lib/paymentComplements.ts`: payment complements use `PAYMENT_COMPLEMENTS_ENV`, `PAYMENT_COMPLEMENTS_ENABLED`, and `PAYMENT_COMPLEMENTS_STAMPING_ENABLED`.
- Email flows use Resend through `RESEND_API_KEY`, `EMAIL_FROM`, and `INVOICE_EMAIL_FROM`.
- WhatsApp notifications use `WHATSAPP_PROVIDER`, `WHATSAPP_PHONE_NUMBER_ID`, and `WHATSAPP_ACCESS_TOKEN`.
- Public links and auth callbacks depend on `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PORTAL_URL`, `PORTAL_URL`, and `PORTAL_HOST`.

## Required Sandbox Variables

Create local variables from `.env.sandbox.example`. For local sandbox testing, copy it to `.env.local` only after replacing placeholders with sandbox values.

Required for boot and auth:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PORTAL_URL`
- `PORTAL_URL`
- `PORTAL_HOST`

Required for fiscal sandbox tests:

- `FACTURAMA_ENV=sandbox`
- `FACTURAMA_ENABLE_PRODUCTION=false`
- `FACTURAMA_USERNAME`
- `FACTURAMA_PASSWORD`
- `FACTURAMA_EXPEDITION_PLACE`
- `FACTURAMA_SANDBOX_RECEIVER_RFC`
- `FACTURAMA_SANDBOX_RECEIVER_NAME`
- `FACTURAMA_SANDBOX_RECEIVER_TAX_REGIME`
- `FACTURAMA_SANDBOX_RECEIVER_ZIP_CODE`
- `PAYMENT_COMPLEMENTS_ENV=sandbox`
- `PAYMENT_COMPLEMENTS_ENABLED=true`
- `PAYMENT_COMPLEMENTS_STAMPING_ENABLED=false` initially

Required for email tests:

- `RESEND_API_KEY`
- `EMAIL_FROM`
- `INVOICE_EMAIL_FROM`
- `POSTSALE_CC_EMAILS`
- `DIRECTOR_EMAILS`

Required only if testing WhatsApp Cloud API:

- `WHATSAPP_PROVIDER=cloud_api`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`

Optional:

- `BANXICO_TOKEN`
- `ALFA_SUPPORT_EMAIL`
- `ALFA_REPRESENTATIVE_NAME`
- `SUPABASE_URL` for scripts such as `npm run sat:import -- --apply`.

## Values That Must Not Point To Production

For sandbox/staging, verify these are not production values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL`
- `FACTURAMA_USERNAME`
- `FACTURAMA_PASSWORD`
- `FACTURAMA_ENV`
- `FACTURAMA_ENABLE_PRODUCTION`
- `RESEND_API_KEY`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_ACCESS_TOKEN`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_PORTAL_URL`
- `PORTAL_URL`
- `PORTAL_HOST`

Sandbox should use a separate Supabase project, separate auth callback URLs, separate storage buckets, separate service role key, and either mock/test provider credentials or providers explicitly configured for sandbox.

## Local Run Against Sandbox

1. Create a Supabase sandbox project.
2. Copy `.env.sandbox.example` to `.env.local`.
3. Replace placeholders with sandbox values only.
4. Confirm fiscal protection flags:
   - `FACTURAMA_ENV=sandbox`
   - `FACTURAMA_ENABLE_PRODUCTION=false`
   - `PAYMENT_COMPLEMENTS_ENV=sandbox`
   - `PAYMENT_COMPLEMENTS_STAMPING_ENABLED=false` until ready to test sandbox stamping.
5. Install dependencies if needed:

```bash
npm install
```

6. Run the app:

```bash
npm run dev
```

7. Open `http://localhost:3000`.

## Supabase Sandbox Setup

1. Create a new Supabase project named clearly, for example `alfa-os-sandbox`.
2. Copy only sandbox keys into local/Vercel variables.
3. Configure Auth URLs:
   - Local site URL: `http://localhost:3000`
   - Staging site URL: the Vercel preview/staging URL
   - Redirect URLs: `/auth/accept-invite`, `/auth/reset-password`, portal URL variants.
4. Create the same storage buckets used by production, but empty.
5. Apply schema migrations to sandbox first, not production.

## Applying SQL Migrations To Sandbox

Use one of these approaches against the sandbox database only:

```bash
psql "$SANDBOX_DATABASE_URL" -f sql/<migration>.sql
```

Or paste the SQL into the Supabase SQL Editor for the sandbox project.

Recommended order:

1. Apply baseline schema migrations in chronological order.
2. Apply public link security migration.
3. Run `sql/security_audit_pg_policies.sql` and save the output.
4. Review the real `pg_policies` output before applying RLS hardening.
5. Apply `sql/20260615_critical_rls_hardening.sql` only after staging review.
6. Keep `sql/20260615_critical_rls_hardening_rollback.sql` ready, but note that normal rollback removes Sprint 4 policies and does not reopen beta policies by default.

Do not apply RLS hardening directly to production without validating sandbox login, portal, fiscal flows, and admin dashboards.

## Vercel Sandbox/Staging Setup

Use a separate Vercel project or a dedicated staging environment for the same project.

1. Create a staging deployment target, for example `alfa-os-staging`.
2. Add environment variables from `.env.sandbox.example` with sandbox values.
3. Set `APP_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_PORTAL_URL`, and `PORTAL_URL` to the staging domain.
4. Set `PORTAL_HOST` to the staging portal host without protocol.
5. Verify `FACTURAMA_ENABLE_PRODUCTION=false`.
6. Verify `WHATSAPP_PROVIDER=mock` unless testing a dedicated WhatsApp test number.
7. Verify email sends go to test inboxes only.

## Data Strategy

Do not copy real fiscal/client data initially. Start with minimum seed data:

- One internal admin user.
- One internal finance user.
- One portal client user.
- One demo client with non-real fiscal data.
- One demo project linked to the demo client.
- One approved demo quote.
- One fake invoice in `draft` or sandbox-only state, with no production `facturama_id`.
- One fake payment.
- One fake payment complement in `draft` or sandbox-only state, with no production `facturama_id`.
- One public document link for an operational document, not fiscal, to validate expiration/revocation behavior.

Fiscal demo data should use Facturama sandbox receiver values and should never contain real RFCs, SAT UUIDs, real PDF/XML, or real customer billing emails.

## Manual Test Checklist

Login and roles:

- Admin can log in to ALFA OS.
- Finance user can access invoices and account statement.
- Authenticated user without role cannot access protected admin pages.
- Portal client can log in only to assigned projects.

Portal:

- Portal shows only demo client projects.
- Portal does not expose other clients, projects, profiles, financial logs, or public document tokens.
- Public document links expire/revoke as expected if security migration is applied.

Fiscal:

- Invoice list loads.
- Project invoice page loads.
- Account statement loads.
- Draft invoice can be created with fake/demo data.
- Fiscal PDF/XML endpoints reject anonymous requests.
- Sandbox stamping remains disabled until explicitly enabled.
- Payment complement flow uses sandbox flags only.

Email:

- Fiscal email preview works.
- Send email uses sandbox sender/test inbox.
- Service completed email uses sandbox sender/test inbox.
- No email goes to real clients.

Documents:

- Delivery PDF link works for authorized users.
- Warranty PDF link works for authorized users.
- Invalid public document token returns a generic error.

RLS:

- Run `sql/security_audit_pg_policies.sql` after migrations.
- Confirm no critical table has `authenticated using (true)` or `with check (true)`.
- Confirm portal user cannot query `public_document_links` directly.

## Hardcoded URL / Domain Findings

Detected production-oriented references that need sandbox attention:

- `SUPABASE_AUTH_INVITATION_TEMPLATE.md` includes `https://portal.alfait.com.mx/auth/accept-invite`; sandbox Supabase Auth templates must use the staging/local URL.
- Default fiscal email sender falls back to `ALFA IT <facturacion@alfait.com.mx>` in invoice/fiscal send routes if `INVOICE_EMAIL_FROM` is missing. Sandbox must set `INVOICE_EMAIL_FROM`.
- Default support email falls back to `soporte@alfait.com` in delivery/warranty flows if `ALFA_SUPPORT_EMAIL` is missing. Sandbox should set `ALFA_SUPPORT_EMAIL`.
- Public landing WhatsApp link uses a hardcoded placeholder phone in `components/PublicLandingClient.tsx`; this does not affect sandbox backend, but it is not environment-driven.
- Facturama base URLs are hardcoded by design in `lib/facturama.ts` and selected by `FACTURAMA_ENV`.
- Resend API URL and WhatsApp Graph API URL are hardcoded provider endpoints by design; credentials/environment decide whether they are live.

## Risks Detected

- `.env*` files are ignored by Git; `.env.sandbox.example` is explicitly unignored so the template can be versioned.
- If `INVOICE_EMAIL_FROM` is omitted, fiscal email routes can use a production-looking sender string.
- If `APP_URL` or portal URL variables point to production, sandbox-generated public links and auth invites can send users to production.
- If `SUPABASE_SERVICE_ROLE_KEY` is accidentally copied from production, sandbox API routes could read/write production data.
- If `FACTURAMA_ENABLE_PRODUCTION=true` or production credentials are copied, real CFDI operations become possible.
- If Resend/WhatsApp production credentials are copied, sandbox actions may notify real clients.
- Existing local `.env.local` is minimal and does not include all variables referenced by code; staging must explicitly set every variable needed for the flows under test.
