# Prueba manual: separacion Portal Cliente vs ERP

Fecha: 2026-06-04

## Precondiciones

- Ejecutar `sql/20260604_separate_internal_and_client_portal_users.sql`.
- Crear o usar un usuario en `client_portal_users` con proyectos asignados.
- Confirmar que su perfil en `profiles` tenga:
  - `role = 'client'`
  - `user_type = 'client_portal'`
  - `is_internal = false`
  - `is_active = true`

## Casos

1. Usuario Portal Cliente
   - Iniciar sesion con usuario cliente.
   - Abrir `/portal`.
   - Resultado esperado: entra correctamente y ve solo proyectos autorizados.

2. Usuario Portal Cliente intentando ERP
   - Con la misma sesion, abrir `/projects`, `/clients`, `/quotes`, `/invoices`, `/dashboard`, `/director-dashboard`, `/contractors`, `/products` y `/admin/operations`.
   - Resultado esperado: no renderiza ERP; redirige a `/portal` o responde no autorizado en endpoints API.

3. Usuario interno ALFA
   - Iniciar sesion con usuario interno activo.
   - Confirmar perfil:
     - `role` interno valido.
     - `user_type = 'internal'`
     - `is_internal = true`
   - Abrir `/dashboard`, `/projects`, `/clients`, `/quotes`.
   - Resultado esperado: entra al ERP segun permisos de su rol.

4. Creacion de nuevo usuario Portal Cliente
   - Desde `/clients/[id]/portal-users`, crear un usuario portal.
   - Resultado esperado:
     - Existe en Supabase Auth.
     - Existe en `client_portal_users`.
     - No queda como `comercial`.
     - Perfil queda como `client`, `client_portal`, `is_internal = false`.
