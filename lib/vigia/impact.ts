/**
 * Calculo unico del impacto monetario total de los hallazgos abiertos.
 * Lo usan el runner (para el brief) y la Bandeja (`lib/vigia/queries.ts`),
 * asi que ambos muestran exactamente el mismo numero.
 */

/**
 * Sensores cuyo impacto es un rollup a nivel entidad de hallazgos mas finos.
 * Cuando existe un hallazgo del sensor rollup para una entidad, los hallazgos
 * de los sensores hoja de esa misma entidad NO se suman al total (ya estan
 * contenidos en el rollup). Evita el doble conteo.
 */
export const IMPACT_ROLLUPS: Record<string, string[]> = {
  "CST-05": ["CST-01"],
};

export type ImpactRow = {
  sensor_id: string;
  entity_type: string | null;
  entity_id: string | null;
  impact_mxn: number | null;
};

export function computeImpactTotal(rows: ImpactRow[]): number {
  const coveredLeaves = new Set<string>();
  for (const row of rows) {
    const leaves = IMPACT_ROLLUPS[row.sensor_id];
    if (!leaves) continue;
    for (const leaf of leaves) {
      coveredLeaves.add(`${leaf}|${row.entity_type ?? ""}|${row.entity_id ?? ""}`);
    }
  }

  return rows.reduce((sum, row) => {
    const key = `${row.sensor_id}|${row.entity_type ?? ""}|${row.entity_id ?? ""}`;
    if (coveredLeaves.has(key)) return sum;
    return sum + Math.abs(Number(row.impact_mxn ?? 0));
  }, 0);
}
