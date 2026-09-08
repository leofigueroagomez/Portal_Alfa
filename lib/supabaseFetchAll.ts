/**
 * El API REST de Supabase corta las respuestas en 1000 filas y ese tope lo
 * impone el servidor: `.limit(5000)` sigue devolviendo 1000, sin error y sin
 * aviso. Cualquier consulta que espere "toda la tabla" tiene que paginar.
 *
 * Sintoma tipico: registros que existen en la base pero nunca aparecen en la
 * UI, siempre los ultimos segun el `order` de la consulta.
 */

export const SUPABASE_PAGE_SIZE = 1000;

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

/**
 * Recorre una consulta por paginas hasta agotarla.
 *
 * IMPORTANTE: `buildPage` debe producir un orden **determinista** (terminar con
 * una columna unica, normalmente `id`). Con empates el motor puede devolver la
 * misma fila en dos paginas y omitir otra.
 *
 * ```ts
 * const { data, error } = await fetchAllRows<Product>((from, to) =>
 *   supabase.from("products").select("*").order("id").range(from, to)
 * );
 * ```
 */
export async function fetchAllRows<T>(
  buildPage: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<{ data: T[]; error: { message: string } | null }> {
  const rows: T[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await buildPage(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      return { data: rows, error };
    }

    const page = data || [];
    rows.push(...page);

    if (page.length < SUPABASE_PAGE_SIZE) {
      return { data: rows, error: null };
    }
  }
}
