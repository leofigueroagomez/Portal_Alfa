import { createSupabaseServerClient } from "@/services/supabaseServer";
import Link from "next/link";
import ProductsTableClient, { ProductForTable } from "./ProductsTableClient";

type TaxonomyOption = {
  id: number;
  name: string | null;
};

export default async function ProductsPage() {
  const supabase = await createSupabaseServerClient();
  const [{ data: products }, { data: categories }, { data: tags }] =
    await Promise.all([
      supabase
        .from("products")
        .select(
          "*, product_categories(id, name), product_tag_assignments(product_tags(id, name))"
        )
        .order("is_favorite", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("product_categories")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("product_tags")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true }),
    ]);

  const productList = (products || []) as ProductForTable[];
  const categoryList = (categories || []) as TaxonomyOption[];
  const tagList = (tags || []) as TaxonomyOption[];

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <div className="mb-10 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-3">
            ALFA OS
          </p>
          <h1 className="text-3xl font-bold sm:text-4xl">Productos</h1>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/product-categories" className="bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] rounded-xl px-5 py-3 font-semibold">
            Categorias
          </Link>
          <Link href="/product-tags" className="bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] rounded-xl px-5 py-3 font-semibold">
            Tags
          </Link>
          <Link href="/products/new" className="bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl px-6 py-3 font-semibold">
            Nuevo producto
          </Link>
        </div>
      </div>

      <ProductsTableClient
        products={productList}
        categories={categoryList}
        tags={tagList}
      />
    </main>
  );
}
