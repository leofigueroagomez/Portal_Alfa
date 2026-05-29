import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  getAvailablePurchasedQuantity,
  getDeliveredQuantityByLine,
} from "@/lib/materialDeliveries";
import { createSupabaseServerClient } from "@/services/supabaseServer";
import NewMaterialDeliveryForm, { AvailableDeliveryLine } from "./NewMaterialDeliveryForm";

type ClientProject = {
  id: number;
  name: string | null;
};

type PurchaseLine = {
  id: number;
  supplier: string | null;
  product_brand: string | null;
  product_model: string | null;
  product_name: string | null;
  quantity_required: number | null;
  quantity_purchased: number | null;
  purchase_status: string | null;
};

type DeliveryItem = {
  project_purchase_line_id: number | null;
  quantity_delivered: number | null;
};

export default async function NewProjectMaterialDeliveryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;
  const { data: project } = await supabase
    .from("client_projects")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  const projectData = project as ClientProject | null;
  const [{ data: rawLines }, { data: rawItems }] = await Promise.all([
    supabase
      .from("project_purchase_lines")
      .select(
        "id, supplier, product_brand, product_model, product_name, quantity_required, quantity_purchased, purchase_status"
      )
      .eq("client_project_id", id)
      .gt("quantity_purchased", 0)
      .order("purchase_status", { ascending: true })
      .order("product_brand", { ascending: true }),
    supabase
      .from("project_material_delivery_items")
      .select("project_purchase_line_id, quantity_delivered")
      .not("project_purchase_line_id", "is", null),
  ]);

  const deliveredByLine = getDeliveredQuantityByLine((rawItems || []) as DeliveryItem[]);
  const availableLines = ((rawLines || []) as PurchaseLine[])
    .map((line) => {
      const deliveredPreviously = Number(deliveredByLine.get(line.id) || 0);
      const quantityAvailable = getAvailablePurchasedQuantity(line, deliveredPreviously);

      return {
        id: line.id,
        supplier: line.supplier,
        product_brand: line.product_brand,
        product_model: line.product_model,
        product_name: line.product_name,
        quantity_required: Number(line.quantity_required || 0),
        quantity_purchased: Number(line.quantity_purchased || 0),
        quantity_delivered_previously: deliveredPreviously,
        quantity_available: quantityAvailable,
        purchase_status: line.purchase_status,
      };
    })
    .filter((line) => line.quantity_available > 0)
    .sort((a, b) => {
      const aWarehouse = a.purchase_status === "in_warehouse" ? 0 : 1;
      const bWarehouse = b.purchase_status === "in_warehouse" ? 0 : 1;

      return (
        aWarehouse - bWarehouse ||
        (a.product_brand || "").localeCompare(b.product_brand || "") ||
        a.id - b.id
      );
    }) satisfies AvailableDeliveryLine[];

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <Link
        href={`/projects/${id}/material-deliveries`}
        className="mb-8 inline-flex items-center gap-2 text-[#B3B3B8]"
      >
        <ArrowLeft size={18} />
        Volver a entregas
      </Link>

      <section className="mb-10">
        <p className="mb-3 text-sm tracking-[0.3em] text-[#9E1B32]">ALFA OS</p>
        <h1 className="text-3xl font-bold sm:text-4xl">Nueva entrega de material</h1>
        <p className="mt-3 text-[#B3B3B8]">
          {projectData?.name || "Proyecto operativo"}
        </p>
      </section>

      <NewMaterialDeliveryForm projectId={Number(id)} lines={availableLines} />
    </main>
  );
}
