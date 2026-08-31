import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildDraftQuote,
  type DraftQuoteInput,
} from "../draftBuilder";

type Row = Record<string, unknown>;
type QueryResult = {
  data: Row[] | Row | null;
  error: { message: string } | null;
};

type ProductFixture = {
  id: number;
  calculated_sale_price: number;
  labor_unit_sale_price: number;
};

type ReferenceFixture = {
  sourceQuoteId: number;
  sourceQuoteNumber: string;
  exchangeRate: number;
  items: Array<{ product_id: number; qty: number }>;
  products: ProductFixture[];
  expected: {
    equipmentTotalUsd: number;
    laborTotalMxn: number;
    subtotalMxn: number;
    grandTotalMxn: number;
    lines: Array<{
      productId: number;
      equipmentTotalUsd: number;
      laborTotalMxn: number;
      lineTotalMxn: number;
    }>;
  };
};

const referenceFixtures: ReferenceFixture[] = [
  {
    sourceQuoteId: 140,
    sourceQuoteNumber: "ALFA-0103-V1",
    exchangeRate: 17.060491,
    items: [{ product_id: 162, qty: 1 }],
    products: [
      { id: 162, calculated_sale_price: 262.26, labor_unit_sale_price: 1000 },
    ],
    expected: {
      equipmentTotalUsd: 262.26,
      laborTotalMxn: 1000,
      subtotalMxn: 5474.28,
      grandTotalMxn: 6350.17,
      lines: [
        {
          productId: 162,
          equipmentTotalUsd: 262.26,
          laborTotalMxn: 1000,
          lineTotalMxn: 5474.28,
        },
      ],
    },
  },
  {
    sourceQuoteId: 152,
    sourceQuoteNumber: "ALFA-0113-V1",
    exchangeRate: 16.95859,
    items: [
      { product_id: 537, qty: 1 },
      { product_id: 538, qty: 1 },
    ],
    products: [
      { id: 537, calculated_sale_price: 17.19, labor_unit_sale_price: 1000 },
      { id: 538, calculated_sale_price: 1.26, labor_unit_sale_price: 0 },
    ],
    expected: {
      equipmentTotalUsd: 18.45,
      laborTotalMxn: 1000,
      subtotalMxn: 1312.89,
      grandTotalMxn: 1522.95,
      lines: [
        {
          productId: 537,
          equipmentTotalUsd: 17.19,
          laborTotalMxn: 1000,
          lineTotalMxn: 1291.52,
        },
        {
          productId: 538,
          equipmentTotalUsd: 1.26,
          laborTotalMxn: 0,
          lineTotalMxn: 21.37,
        },
      ],
    },
  },
  {
    sourceQuoteId: 161,
    sourceQuoteNumber: "ALFA-0120-V1",
    exchangeRate: 16.94897,
    items: [
      { product_id: 357, qty: 1 },
      { product_id: 478, qty: 3 },
      { product_id: 31, qty: 3 },
      { product_id: 192, qty: 1 },
    ],
    products: [
      { id: 357, calculated_sale_price: 80.49, labor_unit_sale_price: 900 },
      { id: 478, calculated_sale_price: 46.74, labor_unit_sale_price: 900 },
      { id: 31, calculated_sale_price: 14.01, labor_unit_sale_price: 0 },
      { id: 192, calculated_sale_price: 75.4, labor_unit_sale_price: 0 },
    ],
    expected: {
      equipmentTotalUsd: 338.14,
      laborTotalMxn: 3600,
      subtotalMxn: 9331.12,
      grandTotalMxn: 10824.1,
      lines: [
        {
          productId: 357,
          equipmentTotalUsd: 80.49,
          laborTotalMxn: 900,
          lineTotalMxn: 2264.22,
        },
        {
          productId: 478,
          equipmentTotalUsd: 140.22,
          laborTotalMxn: 2700,
          lineTotalMxn: 5076.58,
        },
        {
          productId: 31,
          equipmentTotalUsd: 42.03,
          laborTotalMxn: 0,
          lineTotalMxn: 712.37,
        },
        {
          productId: 192,
          equipmentTotalUsd: 75.4,
          laborTotalMxn: 0,
          lineTotalMxn: 1277.95,
        },
      ],
    },
  },
  {
    sourceQuoteId: 163,
    sourceQuoteNumber: "ALFA-0122-V1",
    exchangeRate: 16.94897,
    items: [{ product_id: 32, qty: 1 }],
    products: [
      { id: 32, calculated_sale_price: 34.04, labor_unit_sale_price: 0 },
    ],
    expected: {
      equipmentTotalUsd: 34.04,
      laborTotalMxn: 0,
      subtotalMxn: 576.94,
      grandTotalMxn: 669.25,
      lines: [
        {
          productId: 32,
          equipmentTotalUsd: 34.04,
          laborTotalMxn: 0,
          lineTotalMxn: 576.94,
        },
      ],
    },
  },
  {
    sourceQuoteId: 165,
    sourceQuoteNumber: "ALFA-0124-V1",
    exchangeRate: 16.946665,
    items: [
      { product_id: 548, qty: 1 },
      { product_id: 362, qty: 1 },
      { product_id: 16, qty: 1 },
    ],
    products: [
      { id: 548, calculated_sale_price: 330.57, labor_unit_sale_price: 600 },
      { id: 362, calculated_sale_price: 45.63, labor_unit_sale_price: 300 },
      { id: 16, calculated_sale_price: 175.81, labor_unit_sale_price: 900 },
    ],
    expected: {
      equipmentTotalUsd: 552.01,
      laborTotalMxn: 1800,
      subtotalMxn: 11154.73,
      grandTotalMxn: 12939.49,
      lines: [
        {
          productId: 548,
          equipmentTotalUsd: 330.57,
          laborTotalMxn: 600,
          lineTotalMxn: 6202.06,
        },
        {
          productId: 362,
          equipmentTotalUsd: 45.63,
          laborTotalMxn: 300,
          lineTotalMxn: 1073.28,
        },
        {
          productId: 16,
          equipmentTotalUsd: 175.81,
          laborTotalMxn: 900,
          lineTotalMxn: 3879.39,
        },
      ],
    },
  },
];

class FakeQuery {
  private operation: "select" | "insert" | "delete" = "select";
  private insertPayload: Row[] = [];
  private equalsFilters: Array<[string, unknown]> = [];
  private inFilters: Array<[string, unknown[]]> = [];
  private notNullFields: string[] = [];
  private rowLimit: number | null = null;

  constructor(
    private readonly database: FakeSupabase,
    private readonly table: string
  ) {}

  select(columns?: string) {
    void columns;
    return this;
  }

  insert(payload: Row | Row[]) {
    this.operation = "insert";
    this.insertPayload = Array.isArray(payload) ? payload : [payload];
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(field: string, value: unknown) {
    this.equalsFilters.push([field, value]);
    return this;
  }

  in(field: string, values: unknown[]) {
    this.inFilters.push([field, values]);
    return this;
  }

  not(field: string, operator: string, value: unknown) {
    void operator;
    void value;
    this.notNullFields.push(field);
    return this;
  }

  order(field: string, options?: { ascending?: boolean }) {
    void field;
    void options;
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  single() {
    return this.execute("single");
  }

  maybeSingle() {
    return this.execute("single");
  }

  then(
    onFulfilled: (value: QueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown
  ) {
    return this.execute("many").then(onFulfilled, onRejected);
  }

  private async execute(mode: "many" | "single"): Promise<QueryResult> {
    let rows: Row[];
    if (this.operation === "insert") {
      const failure = this.database.consumeInsertFailure(this.table);
      if (failure) {
        return { data: null, error: { message: failure } };
      }
      rows = this.database.insert(this.table, this.insertPayload);
    } else if (this.operation === "delete") {
      rows = this.database.remove(this.table, this.equalsFilters);
    } else {
      rows = this.database.read(this.table);
      for (const [field, value] of this.equalsFilters) {
        rows = rows.filter((row) => row[field] === value);
      }
      for (const [field, values] of this.inFilters) {
        rows = rows.filter((row) => values.includes(row[field]));
      }
      for (const field of this.notNullFields) {
        rows = rows.filter((row) => row[field] !== null && row[field] !== undefined);
      }
      if (this.rowLimit !== null) rows = rows.slice(-this.rowLimit);
    }

    return {
      data: mode === "single" ? rows.at(-1) || null : rows,
      error: null,
    };
  }
}

class FakeSupabase {
  readonly rows: Record<string, Row[]>;
  private nextId = 1000;
  private readonly insertFailures = new Map<string, string>();

  constructor(products: ProductFixture[]) {
    this.rows = {
      company_settings: [{ id: true, indirect_cost_percent: 0 }],
      products: products.map((product) => ({
        id: product.id,
        brand: "Referencia",
        model: `P-${product.id}`,
        name: `Producto referencia ${product.id}`,
        image_url: null,
        cost_price: product.calculated_sale_price * 0.7,
        cost_currency: "USD",
        calculated_sale_price: product.calculated_sale_price,
        sale_currency: "USD",
        pricing_method: "target_margin",
        target_margin: 30,
        labor_unit_cost: product.labor_unit_sale_price / 2,
        labor_unit_sale_price: product.labor_unit_sale_price,
      })),
      labor_activity_catalog: [],
      quote_groups: [{ id: 1, base_number: "ALFA-0200" }],
      quotes: [],
      quote_sections: [],
      quote_items: [],
      quote_item_labor_activities: [],
      quote_terms_settings: [],
    };
  }

  from(table: string) {
    if (!this.rows[table]) this.rows[table] = [];
    return new FakeQuery(this, table);
  }

  read(table: string) {
    return [...(this.rows[table] || [])];
  }

  insert(table: string, payload: Row[]) {
    const inserted = payload.map((row) => ({
      ...row,
      id: row.id ?? ++this.nextId,
      created_at: row.created_at ?? new Date().toISOString(),
    }));
    this.rows[table].push(...inserted);
    return inserted;
  }

  failNextInsert(table: string, message = "fallo de prueba") {
    this.insertFailures.set(table, message);
  }

  consumeInsertFailure(table: string) {
    const message = this.insertFailures.get(table) || null;
    this.insertFailures.delete(table);
    return message;
  }

  remove(table: string, filters: Array<[string, unknown]>) {
    const removed = this.rows[table].filter((row) =>
      filters.every(([field, value]) => row[field] === value)
    );

    if (table === "quotes") {
      const quoteIds = new Set(removed.map((row) => row.id));
      const sectionIds = new Set(
        this.rows.quote_sections
          .filter((row) => quoteIds.has(row.quote_id))
          .map((row) => row.id)
      );
      const itemIds = new Set(
        this.rows.quote_items
          .filter((row) => quoteIds.has(row.quote_id))
          .map((row) => row.id)
      );
      this.rows.quote_item_labor_activities =
        this.rows.quote_item_labor_activities.filter(
          (row) => !itemIds.has(row.quote_item_id)
        );
      this.rows.quote_items = this.rows.quote_items.filter(
        (row) => !quoteIds.has(row.quote_id) && !sectionIds.has(row.quote_section_id)
      );
      this.rows.quote_sections = this.rows.quote_sections.filter(
        (row) => !quoteIds.has(row.quote_id)
      );
      this.rows.quote_terms_settings = this.rows.quote_terms_settings.filter(
        (row) => !quoteIds.has(row.quote_id)
      );
    }

    this.rows[table] = this.rows[table].filter(
      (row) => !filters.every(([field, value]) => row[field] === value)
    );
    return removed;
  }
}

function asSupabase(fake: FakeSupabase) {
  return fake as unknown as SupabaseClient;
}

async function withExchangeRate<T>(rate: number, callback: () => Promise<T>) {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.BANXICO_TOKEN;
  delete process.env.BANXICO_TOKEN;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        rates: { MXN: rate },
        time_last_update_utc: "2026-08-31T12:00:00Z",
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

  try {
    return await callback();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.BANXICO_TOKEN;
    else process.env.BANXICO_TOKEN = originalToken;
  }
}

for (const fixture of referenceFixtures) {
  test(
    `regresion reconstruida ${fixture.sourceQuoteNumber} (#${fixture.sourceQuoteId}) cuadra al centavo`,
    async () => {
      const fake = new FakeSupabase(fixture.products);
      const input: DraftQuoteInput = {
        client_id: 9000 + fixture.sourceQuoteId,
        items: fixture.items,
      };

      const result = await withExchangeRate(fixture.exchangeRate, () =>
        buildDraftQuote(asSupabase(fake), input)
      );

      assert.equal(result.grand_total_mxn, fixture.expected.grandTotalMxn);
      assert.deepEqual(result.warnings, []);

      const storedQuote = fake.rows.quotes[0];
      assert.equal(storedQuote.equipment_total, fixture.expected.equipmentTotalUsd);
      assert.equal(storedQuote.labor_total, fixture.expected.laborTotalMxn);
      assert.equal(storedQuote.subtotal_mxn, fixture.expected.subtotalMxn);
      assert.equal(storedQuote.grand_total, fixture.expected.grandTotalMxn);
      assert.equal(storedQuote.status, "draft");

      assert.deepEqual(
        fake.rows.quote_items.map((row) => ({
          productId: row.product_id,
          equipmentTotalUsd: row.equipment_total_usd,
          laborTotalMxn: row.labor_total,
          lineTotalMxn: row.line_total,
        })),
        fixture.expected.lines
      );
    }
  );
}

test("reutiliza el mismo borrador cuando se repite exactamente el input", async () => {
  const fixture = referenceFixtures[1];
  const fake = new FakeSupabase(fixture.products);
  const input: DraftQuoteInput = {
    client_id: 9901,
    items: fixture.items,
    notes: "Prueba de idempotencia",
  };

  const first = await withExchangeRate(fixture.exchangeRate, () =>
    buildDraftQuote(asSupabase(fake), input)
  );
  const second = await withExchangeRate(fixture.exchangeRate, () =>
    buildDraftQuote(asSupabase(fake), input)
  );

  assert.equal(second.quote_id, first.quote_id);
  assert.equal(fake.rows.quotes.length, 1);
  assert.equal(fake.rows.quote_groups.length, 2);
});

test("avisa por costo faltante sin impedir un borrador con precio de catalogo", async () => {
  const fake = new FakeSupabase([
    { id: 777, calculated_sale_price: 100, labor_unit_sale_price: 0 },
  ]);
  fake.rows.products[0].cost_price = null;

  const result = await withExchangeRate(17, () =>
    buildDraftQuote(asSupabase(fake), {
      client_id: 9902,
      items: [{ product_id: 777, qty: 1 }],
    })
  );

  assert.equal(result.grand_total_mxn, 1972);
  assert.deepEqual(result.warnings, ["Producto 777: costo faltante o en cero."]);
});

test("aplica margen solicitado e indirecto sin sumar dos veces el indirecto", async () => {
  const fake = new FakeSupabase([
    { id: 778, calculated_sale_price: 100, labor_unit_sale_price: 0 },
  ]);
  fake.rows.products[0].cost_price = 70;

  const result = await withExchangeRate(20, () =>
    buildDraftQuote(asSupabase(fake), {
      client_id: 9903,
      items: [{ product_id: 778, qty: 2, margin_percent: 50 }],
      indirect_cost_percent: 10,
    })
  );

  assert.equal(result.grand_total_mxn, 7145.6);
  assert.equal(fake.rows.quotes[0].equipment_total, 308);
  assert.equal(fake.rows.quotes[0].indirect_cost_mxn, 560);
  assert.equal(fake.rows.quotes[0].subtotal_mxn, 6160);
});

test("crea una partida de mano de obra independiente con su actividad", async () => {
  const fake = new FakeSupabase([]);
  fake.rows.labor_activity_catalog.push({
    id: 12,
    name: "Cableado",
    default_unit: "metro",
    default_internal_cost_mxn: 20,
    default_sale_price_mxn: 50,
  });

  const result = await withExchangeRate(17, () =>
    buildDraftQuote(asSupabase(fake), {
      client_id: 9904,
      items: [],
      labor: [{ labor_activity_id: 12, qty: 3 }],
    })
  );

  assert.equal(result.grand_total_mxn, 174);
  assert.equal(fake.rows.quote_sections[0].name, "Mano de obra");
  assert.equal(fake.rows.quote_items[0].product_id, null);
  assert.equal(fake.rows.quote_items[0].labor_total, 150);
  assert.equal(fake.rows.quote_item_labor_activities[0].labor_activity_id, 12);
});

test("limpia quote y quote_group si falla una escritura posterior", async () => {
  const fixture = referenceFixtures[0];
  const fake = new FakeSupabase(fixture.products);
  fake.failNextInsert("quote_terms_settings", "terminos no disponibles");

  await assert.rejects(
    withExchangeRate(fixture.exchangeRate, () =>
      buildDraftQuote(asSupabase(fake), {
        client_id: 9905,
        items: fixture.items,
      })
    ),
    /No se pudieron crear los terminos de la cotizacion: terminos no disponibles/
  );

  assert.equal(fake.rows.quotes.length, 0);
  assert.equal(fake.rows.quote_groups.length, 1);
  assert.equal(fake.rows.quote_sections.length, 0);
  assert.equal(fake.rows.quote_items.length, 0);
  assert.equal(fake.rows.quote_item_labor_activities.length, 0);
  assert.equal(fake.rows.quote_terms_settings.length, 0);
});
