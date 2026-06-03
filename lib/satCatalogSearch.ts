import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/services/supabaseAdmin";
import { createSupabaseServerClient } from "@/services/supabaseServer";

type CatalogKind =
  | "product-services"
  | "units"
  | "fiscal-regimes"
  | "cfdi-uses"
  | "tax-objects";

type CatalogConfig = {
  table: string;
  select: string;
  textFields: string[];
  minQueryLength: number;
  supportsPersonType?: boolean;
};

const configs: Record<CatalogKind, CatalogConfig> = {
  "product-services": {
    table: "sat_product_service_catalog",
    select: "code, description, is_active",
    textFields: ["description"],
    minQueryLength: 2,
  },
  units: {
    table: "sat_unit_catalog",
    select: "code, name, description, is_active",
    textFields: ["name", "description"],
    minQueryLength: 2,
  },
  "fiscal-regimes": {
    table: "fiscal_regime_catalog",
    select: "code, name, applies_to_person_type, is_active",
    textFields: ["name"],
    minQueryLength: 2,
    supportsPersonType: true,
  },
  "cfdi-uses": {
    table: "cfdi_use_catalog",
    select: "code, name, applies_to_person_type, is_active",
    textFields: ["name"],
    minQueryLength: 2,
    supportsPersonType: true,
  },
  "tax-objects": {
    table: "tax_object_catalog",
    select: "code, name, is_active",
    textFields: ["name"],
    minQueryLength: 1,
  },
};

function uniqueByCode<T extends { code?: string | null }>(items: T[]) {
  const seen = new Set<string>();
  const unique: T[] = [];

  for (const item of items) {
    const code = item.code || "";
    if (!code || seen.has(code)) continue;
    seen.add(code);
    unique.push(item);
  }

  return unique;
}

function accentVariants(value: string) {
  const replacements: Record<string, string[]> = {
    a: ["a", "á"],
    e: ["e", "é"],
    i: ["i", "í"],
    o: ["o", "ó"],
    u: ["u", "ú", "ü"],
  };
  const variants = new Set([""]);

  for (const char of value.toLowerCase()) {
    const options = replacements[char] || [char];
    const prefixes = [...variants];
    variants.clear();

    for (const prefix of prefixes) {
      for (const option of options) {
        variants.add(`${prefix}${option}`);
        if (variants.size >= 50) break;
      }
      if (variants.size >= 50) break;
    }
  }

  return [...variants];
}

function applyPersonTypeFilter<Query>(
  query: Query,
  personType: string | null,
  config: CatalogConfig
) {
  if (
    !config.supportsPersonType ||
    (personType !== "physical" && personType !== "moral")
  ) {
    return query;
  }

  return (query as { in: (column: string, values: string[]) => Query }).in(
    "applies_to_person_type",
    ["both", personType]
  );
}

async function createCatalogClient() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createSupabaseAdminClient();
  }

  return createSupabaseServerClient();
}

export async function handleSatCatalogSearch(
  request: NextRequest,
  kind: CatalogKind
) {
  const config = configs[kind];
  const params = request.nextUrl.searchParams;
  const code = params.get("code")?.trim();
  const queryText = params.get("q")?.trim() || "";
  const personType = params.get("person_type");
  const supabase = await createCatalogClient();

  if (code) {
    const { data, error } = await supabase
      .from(config.table)
      .select(config.select)
      .eq("code", code.toUpperCase())
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message, items: [] }, { status: 500 });
    }

    return NextResponse.json({ items: data || [] });
  }

  if (queryText.length < config.minQueryLength) {
    return NextResponse.json({
      items: [],
      minQueryLength: config.minQueryLength,
    });
  }

  const codeQuery = applyPersonTypeFilter(
    supabase
      .from(config.table)
      .select(config.select)
      .eq("is_active", true)
      .ilike("code", `${queryText}%`)
      .order("code", { ascending: true })
      .limit(20),
    personType,
    config
  );
  const queryVariants = accentVariants(queryText);
  const textQueries = config.textFields.flatMap((field) =>
    queryVariants.map((queryVariant) =>
      applyPersonTypeFilter(
        supabase
          .from(config.table)
          .select(config.select)
          .eq("is_active", true)
          .ilike(field, `%${queryVariant}%`)
          .order("code", { ascending: true })
          .limit(20),
        personType,
        config
      )
    )
  );
  const results = await Promise.all([codeQuery, ...textQueries]);
  const error = results.find((result) => result.error)?.error;

  if (error) {
    return NextResponse.json({ error: error.message, items: [] }, { status: 500 });
  }

  const rows = results.flatMap(
    (result) => (result.data || []) as Array<{ code?: string | null }>
  );
  const items = uniqueByCode(rows).slice(0, 20);

  return NextResponse.json({ items });
}
