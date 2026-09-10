# Rollback - Parche de seguridad de dependencias 2026-09-10

## Alcance

Este plan revierte exclusivamente cambios de dependencias npm. Toca unicamente
`package.json` y `package-lock.json`.

No modifica codigo de aplicacion, base de datos, RLS, Storage, Facturama, CFDI,
portal ni el vinculo del proyecto en Vercel (`.vercel/`).

## Que se cambio

| Paquete | Antes | Despues | Motivo |
| --- | --- | --- | --- |
| `next` | 16.2.6 | 16.3.4 | 2 RCE criticas sin autenticar (Windows, AVIF en Image Optimization) que exigen >=16.3.3, mas 9 avisos de 16.2.x |
| `eslint-config-next` | 16.2.6 | 16.3.4 | debe ir a la par de `next` |
| `sharp` | 0.34.5 | 0.35.4 | transitivo de `next`; CVEs heredadas de libvips y libheif |
| `postcss` | 8.5.14 | 8.5.23 | transitivo de `next`; path traversal via sourceMappingURL |
| `nanoid` | 3.3.12 | 3.3.18 | transitivo de `postcss` |
| `supabase` (CLI) | 2.109.0 | 2.117.0 | herramienta de desarrollo |
| `tsx` | 4.21.0 | 4.23.13 | herramienta de desarrollo |
| `vercel` (CLI) | 54.9.1 | **removido** | ver nota abajo |

Se agregaron dos `overrides`:

```json
"overrides": {
  "tar": "^7.5.18",
  "js-yaml": "^4.3.1"
}
```

`js-yaml` sigue en el arbol (via el toolchain de eslint) y el override esta
activo. `tar` ya no aparece tras remover el CLI de Vercel; el override se deja
como resguardo por si algo lo reintroduce.

## Nota sobre el CLI de Vercel

`vercel` se removio de `devDependencies` porque empaqueta builders para
frameworks que este proyecto no usa (Elysia, Hono, Koa, NestJS, Redwood, Remix,
Rust, Python) y esos builders arrastraban 27 avisos con majors viejos
(`undici` 5.x, `minimatch` 3.x, `ajv` 6.x, `path-to-regexp` 6.x) que no tienen
parche upstream.

Esto **no afecta el despliegue**: Vercel construye desde el push de Git, no
desde el CLI local. El vinculo del proyecto en `.vercel/` quedo intacto.

Para seguir usando el CLI localmente, sin reinstalarlo en el proyecto:

```bash
npx -y vercel@latest --version
```

Verificado: responde `Vercel CLI 59.15.1`.

Si se prefiere tenerlo permanente, instalarlo global (fuera del arbol del
proyecto, no vuelve a contar en `npm audit`):

```bash
npm install -g vercel
```

## Puntos de retorno

Etiquetas creadas en el repositorio:

| Etiqueta | Commit | Estado |
| --- | --- | --- |
| `deps-antes-de-todo` | `a635734` | `main` antes de cualquier cambio de dependencias |
| `deps-antes-de-quitar-vercel` | `97bce1a` | con `next` 16.3.4 y el CLI de Vercel todavia presente |

## Revertir todo (volver a como estaba)

```bash
git checkout deps-antes-de-todo -- package.json package-lock.json
npm ci
```

Esto restaura `next` 16.2.6 y el arbol completo original. **Reintroduce las 2
RCE criticas**: hacerlo solo si el parche rompe algo en produccion, y abrir de
inmediato un plan para volver a parchar.

## Revertir solo la salida del CLI de Vercel

Si el problema fuese unicamente que hace falta `vercel` como dependencia del
proyecto, conservando el parche de `next`:

```bash
git checkout deps-antes-de-quitar-vercel -- package.json package-lock.json
npm ci
```

Vuelven los 27 avisos, todos en `devDependencies`, pero se conserva `next`
16.3.4.

## Verificacion despues de cualquier rollback

```bash
npx tsc --noEmit
npm run build
npm audit
```

Y con el servidor de desarrollo arriba, confirmar que `proxy.ts` sigue cerrando
las rutas internas:

```bash
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/quotes
```

Debe responder `307 http://localhost:3000/login?redirectedFrom=%2Fquotes`.

## Resultado validado del parche

- `npm audit`: 41 avisos (2 criticos) -> **0**
- `npx tsc --noEmit`: limpio
- `npm run build`: exit 0, sin warnings, 56 paginas estaticas
- Servidor de desarrollo: landing 200, sin errores en logs
- `proxy.ts`: 307 a `/login` en `/quotes`, `/invoices`, `/users`, `/settings`
  y `/portal` sin sesion
- Lint sin regresion: 423 problemas / 69 errores identicos antes y despues,
  comprobado reinstalando el arbol previo con `npm ci`
