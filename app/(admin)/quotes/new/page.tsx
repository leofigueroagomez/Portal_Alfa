"use client";

import { useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import { supabase } from "@/services/supabase";
import { formatCurrency, formatNumber } from "@/lib/format";
import QuickCreateProductButton from "../QuickCreateProductButton";

type Product = {
  id: number;
  brand: string;
  model: string;
  name: string;
  category: string | null;
  category_id: number | null;
  image_url: string | null;
  cost_price: number | null;
  cost_currency: string | null;
  calculated_sale_price: number;
  sale_currency: string;
  labor_unit_cost: number | null;
  labor_unit_sale_price: number;
  is_favorite: boolean | null;
  product_categories?: {
    name: string | null;
  } | null;
  product_tag_assignments?: {
    product_tags: {
      id: number;
      name: string | null;
    } | null;
  }[];
};

type Client = {
  id: number;
  client_number: number | null;
  name: string | null;
};

type ClientProject = {
  id: number;
  project_number: number | null;
  name: string | null;
};

type QuoteTermsSettings = {
  payment_100_equipment: boolean;
  labor_payment_mode: string;
  payment_100_advance: boolean;
  is_local_guadalajara: boolean;
  includes_travel_expenses: boolean;
  includes_conduit: boolean;
  includes_cabling: boolean;
};

type TaxonomyOption = {
  id: number;
  name: string;
};

type QuoteItem = Product & {
  quantity: number;
};

type QuoteSection = {
  id: string;
  name: string;
  items: QuoteItem[];
};

function getEquipmentUnitPriceUsd(
  item: { calculated_sale_price: number; sale_currency: string | null },
  exchangeRate: number
) {
  if ((item.sale_currency || "USD").toUpperCase() === "MXN") {
    return exchangeRate > 0 ? item.calculated_sale_price / exchangeRate : 0;
  }

  return item.calculated_sale_price;
}

function normalizeToMXN(
  value: number | null | undefined,
  currency: string | null | undefined,
  exchangeRate: number
) {
  if ((currency || "USD").toUpperCase() === "MXN") {
    return Number(value || 0);
  }

  return Number(value || 0) * exchangeRate;
}

function getMarginColorClass(percent: number) {
  if (percent >= 30) return "text-[#8CE0B6]";
  if (percent >= 15) return "text-[#F4C66A]";
  return "text-[#F28B82]";
}

function canMarkProjectQuoted(stage: string | null | undefined) {
  return !["won", "installed", "closed"].includes(stage || "");
}

export default function NewQuotePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategories, setProductCategories] = useState<TaxonomyOption[]>(
    []
  );
  const [productTags, setProductTags] = useState<TaxonomyOption[]>([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
const [sections, setSections] = useState<QuoteSection[]>([]);
  const [draggingItem, setDraggingItem] = useState<{
    sectionId: string;
    productId: number;
  } | null>(null);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [newSectionName, setNewSectionName] = useState("");
  const [search, setSearch] = useState("");
  const [savingQuote, setSavingQuote] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientProjects, setClientProjects] = useState<ClientProject[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClientProjectId, setSelectedClientProjectId] = useState("");
  const [exchangeRate, setExchangeRate] = useState("17");
  const [exchangeRateSource, setExchangeRateSource] = useState("manual");
  const [exchangeRateDate, setExchangeRateDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [discountType, setDiscountType] = useState("none");
  const [discountPercent, setDiscountPercent] = useState("");
  const [discountAmountMXN, setDiscountAmountMXN] = useState("");
  const [notes, setNotes] = useState("");
  const [termsSettings, setTermsSettings] = useState<QuoteTermsSettings>({
    payment_100_equipment: true,
    labor_payment_mode: "50_50",
    payment_100_advance: false,
    is_local_guadalajara: true,
    includes_travel_expenses: false,
    includes_conduit: false,
    includes_cabling: false,
  });

  function updateTermsField(
    field: keyof QuoteTermsSettings,
    value: boolean | string
  ) {
    setTermsSettings((current) => ({
      ...current,
      [field]: value,
    }));
  }

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase
        .from("products")
        .select(
          "*, product_categories(name), product_tag_assignments(product_tags(id, name))"
        )
        .eq("is_active", true)
        .order("is_favorite", { ascending: false })
        .order("brand", { ascending: true });

      setProducts(data || []);
    }

    loadProducts();
  }, []);

  useEffect(() => {
    async function loadTaxonomy() {
      const [{ data: categoryData }, { data: tagData }] = await Promise.all([
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

      setProductCategories((categoryData || []) as TaxonomyOption[]);
      setProductTags((tagData || []) as TaxonomyOption[]);
    }

    loadTaxonomy();
  }, []);

  useEffect(() => {
    async function loadClients() {
      const { data, error } = await supabase
        .from("clients")
        .select("id, client_number, name")
        .order("client_number", { ascending: true });

      if (error) {
        console.error("Error cargando clientes:", error);
        return;
      }

      setClients((data || []) as Client[]);
    }

    loadClients();
  }, []);

  useEffect(() => {
    async function loadExchangeRate() {
      try {
        const response = await fetch("/api/exchange-rate");
        const data = await response.json();

        if (data?.rate) {
          setExchangeRate(String(data.rate));
          setExchangeRateSource(data.source || "fallback-manual");
          setExchangeRateDate(
            data.date || new Date().toISOString().slice(0, 10)
          );
          return;
        }

        console.error("No se pudo cargar tipo de cambio:", data);
        alert("No se pudo cargar tipo de cambio. Captúralo manualmente.");
        setExchangeRateSource("manual");
        setExchangeRateDate(new Date().toISOString().slice(0, 10));
      } catch (error) {
        console.error("Error cargando tipo de cambio:", error);
        alert("No se pudo cargar tipo de cambio. Captúralo manualmente.");
        setExchangeRateSource("manual");
        setExchangeRateDate(new Date().toISOString().slice(0, 10));
      }
    }

    loadExchangeRate();
  }, []);

  useEffect(() => {
    async function loadClientProjects() {
      if (!selectedClientId) {
        setClientProjects([]);
        setSelectedClientProjectId("");
        return;
      }

      const { data, error } = await supabase
        .from("client_projects")
        .select("id, project_number, name")
        .eq("client_id", Number(selectedClientId))
        .order("project_number", { ascending: true });

      if (error) {
        console.error("Error cargando proyectos del cliente:", error);
        return;
      }

      setClientProjects((data || []) as ClientProject[]);
      setSelectedClientProjectId("");
    }

    loadClientProjects();
  }, [selectedClientId]);

  useEffect(() => {
    if (!activeSectionId && sections.length > 0) {
      setActiveSectionId(sections[0].id);
    }
  }, [sections, activeSectionId]);

  function addSection() {
    if (!newSectionName.trim()) {
      alert("Escribe el nombre del sistema");
      return;
    }

    const newSection = {
      id: crypto.randomUUID(),
      name: newSectionName,
      items: [],
    };

    setSections((current) => [...current, newSection]);
    setActiveSectionId(newSection.id);
    setNewSectionName("");
  }

  function renameSection(sectionId: string, newName: string) {
    setSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              name: newName,
            }
          : section
      )
    );
  }

  function removeSection(sectionId: string) {
    const confirmed = window.confirm(
      "¿Eliminar este sistema y todas sus partidas?"
    );

    if (!confirmed) return;

    const nextSections = sections.filter(
      (section) => section.id !== sectionId
    );

    setSections(nextSections);

    if (activeSectionId === sectionId) {
      setActiveSectionId(nextSections[0]?.id || "");
    }
  }

  function addProduct(product: Product) {
    if (!activeSectionId) {
      alert("Selecciona un sistema primero");
      return;
    }

    setSections((current) =>
      current.map((section) => {
        if (section.id !== activeSectionId) {
          return section;
        }

        const existing = section.items.find(
          (item) => item.id === product.id
        );

        if (existing) {
          return {
            ...section,
            items: section.items.map((item) =>
              item.id === product.id
                ? {
                    ...item,
                    quantity: item.quantity + 1,
                  }
                : item
            ),
          };
        }

        return {
          ...section,
          items: [
            ...section.items,
            {
              ...product,
              quantity: 1,
            },
          ],
        };
      })
    );
  }

  function updateQuantity(
    sectionId: string,
    productId: number,
    quantity: number
  ) {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        return {
          ...section,
          items: section.items.map((item) =>
            item.id === productId
              ? {
                  ...item,
                  quantity,
                }
              : item
          ),
        };
      })
    );
  }

  function removeItem(sectionId: string, productId: number) {
    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) {
          return section;
        }

        return {
          ...section,
          items: section.items.filter(
            (item) => item.id !== productId
          ),
        };
      })
    );
  }

  function handleItemDrop(sectionId: string, targetProductId: number) {
    if (!draggingItem || draggingItem.sectionId !== sectionId) {
      setDraggingItem(null);
      return;
    }

    if (draggingItem.productId === targetProductId) {
      setDraggingItem(null);
      return;
    }

    setSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;

        const oldIndex = section.items.findIndex(
          (item) => item.id === draggingItem.productId
        );
        const newIndex = section.items.findIndex(
          (item) => item.id === targetProductId
        );

        if (oldIndex === -1 || newIndex === -1) return section;

        return {
          ...section,
          items: arrayMove(section.items, oldIndex, newIndex),
        };
      })
    );
    setDraggingItem(null);
  }

  function handleProductCreated(product: Product) {
    setProducts((current) =>
      [...current, product].sort((a, b) => a.brand.localeCompare(b.brand))
    );
  }

  const filteredProducts = products.filter((product) => {
    const query = search.toLowerCase();
    const productTags =
      product.product_tag_assignments
        ?.map((assignment) => assignment.product_tags)
        .filter(Boolean) || [];

    const matchesSearch =
      product.brand?.toLowerCase().includes(query) ||
      product.model?.toLowerCase().includes(query) ||
      product.name?.toLowerCase().includes(query);

    const matchesCategory =
      !categoryFilter || String(product.category_id || "") === categoryFilter;
    const matchesTag =
      !tagFilter || productTags.some((tag) => String(tag?.id) === tagFilter);
    const matchesFavorite = !favoritesOnly || Boolean(product.is_favorite);

    return matchesSearch && matchesCategory && matchesTag && matchesFavorite;
  });

  const numericExchangeRate = Number(exchangeRate) || 1;

  const equipmentTotalUSD = sections.reduce((sectionSum, section) => {
    const total = section.items.reduce((sum, item) => {
      return (
        sum + getEquipmentUnitPriceUsd(item, numericExchangeRate) * item.quantity
      );
    }, 0);

    return sectionSum + total;
  }, 0);

  const laborTotalMXN = sections.reduce((sectionSum, section) => {
    const total = section.items.reduce((sum, item) => {
      return sum + item.labor_unit_sale_price * item.quantity;
    }, 0);

    return sectionSum + total;
  }, 0);

  const equipmentTotalMXN = equipmentTotalUSD * numericExchangeRate;
  const subtotalMXN = equipmentTotalMXN + laborTotalMXN;
  const discountMXN =
    discountType === "percent"
      ? subtotalMXN * ((Number(discountPercent) || 0) / 100)
      : discountType === "amount"
        ? Number(discountAmountMXN) || 0
        : 0;
  const cappedDiscountMXN = Math.min(Math.max(discountMXN, 0), subtotalMXN);
  const taxableBaseMXN = subtotalMXN - cappedDiscountMXN;
  const ivaMXN = taxableBaseMXN * 0.16;
  const totalMXN = taxableBaseMXN + ivaMXN;
  const grandTotalMXN = totalMXN;
  const equipmentCostMXN = sections.reduce((sectionSum, section) => {
    const total = section.items.reduce((sum, item) => {
      return (
        sum +
        normalizeToMXN(
          item.cost_price,
          item.cost_currency || item.sale_currency,
          numericExchangeRate
        ) *
          item.quantity
      );
    }, 0);

    return sectionSum + total;
  }, 0);
  const laborCostMXN = sections.reduce((sectionSum, section) => {
    const total = section.items.reduce((sum, item) => {
      return sum + Number(item.labor_unit_cost || 0) * item.quantity;
    }, 0);

    return sectionSum + total;
  }, 0);
  const totalSaleBeforeIVA = taxableBaseMXN;
  const totalCostMXN = equipmentCostMXN + laborCostMXN;
  const operatingMarginMXN = totalSaleBeforeIVA - totalCostMXN;
  const operatingMarginPercent =
    totalSaleBeforeIVA > 0
      ? (operatingMarginMXN / totalSaleBeforeIVA) * 100
      : 0;
  const operatingMarginColorClass = getMarginColorClass(
    operatingMarginPercent
  );

  function getSectionEquipmentTotal(section: QuoteSection) {
    return section.items.reduce((sum, item) => {
      return (
        sum + getEquipmentUnitPriceUsd(item, numericExchangeRate) * item.quantity
      );
    }, 0);
  }

  function getSectionLaborTotal(section: QuoteSection) {
    return section.items.reduce((sum, item) => {
      return sum + item.labor_unit_sale_price * item.quantity;
    }, 0);
  }

  async function getNextBaseNumber() {
    const { data } = await supabase
      .from("quote_groups")
      .select("base_number")
      .not("base_number", "is", null)
      .order("base_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastNumber = data?.base_number?.match(/ALFA-(\d+)/)?.[1];
    const nextNumber = (Number(lastNumber) || 0) + 1;

    return `ALFA-${String(nextNumber).padStart(4, "0")}`;
  }

  async function handleSaveQuote() {
    setSavingQuote(true);

    const baseNumber = await getNextBaseNumber();

    const { data: quoteGroup, error: quoteGroupError } = await supabase
      .from("quote_groups")
      .insert({
        base_number: baseNumber,
      })
      .select("id")
      .single();

    if (quoteGroupError || !quoteGroup) {
      const error = quoteGroupError || { message: "No se recibió quote_group" };
      console.error("Error creando quote_group:", error);
      alert(
        "Error creando quote_group: " +
          JSON.stringify(error) +
          ("message" in error && error.message ? ` ${error.message}` : "")
      );
      setSavingQuote(false);
      return;
    }

    const quotePayload = {
      quote_group_id: quoteGroup.id,
      quote_base_number: baseNumber,
      version: 1,
      quote_number: `${baseNumber}-V1`,
      is_latest: true,
      status: "draft",
      currency: "USD",
      client_id: selectedClientId ? Number(selectedClientId) : null,
      client_project_id: selectedClientProjectId
        ? Number(selectedClientProjectId)
        : null,
      exchange_rate: numericExchangeRate,
      exchange_rate_source: exchangeRateSource,
      exchange_rate_date: exchangeRateDate,
      equipment_total: equipmentTotalUSD,
      labor_total: laborTotalMXN,
      discount_type: discountType,
      discount_percent:
        discountType === "percent" ? Number(discountPercent) || 0 : 0,
      discount_amount_mxn: cappedDiscountMXN,
      subtotal_mxn: subtotalMXN,
      taxable_base_mxn: taxableBaseMXN,
      iva_mxn: ivaMXN,
      total_mxn: totalMXN,
      grand_total: grandTotalMXN,
      notes: notes.trim() || null,
    };

    let quotePayloadToInsert: Record<string, string | number | null | boolean> = {
      ...quotePayload,
    };
    let quoteResult = await supabase
      .from("quotes")
      .insert(quotePayloadToInsert)
      .select("id")
      .single();

    if (quoteResult.error?.code === "PGRST204") {
      quotePayloadToInsert = { ...quotePayloadToInsert };

      if (quoteResult.error.message.includes("client_project_id")) {
        delete quotePayloadToInsert.client_project_id;
      }

      if (quoteResult.error.message.includes("exchange_rate_source")) {
        delete quotePayloadToInsert.exchange_rate_source;
      }

      if (quoteResult.error.message.includes("exchange_rate_date")) {
        delete quotePayloadToInsert.exchange_rate_date;
      }

      if (quoteResult.error.message.includes("discount_type")) {
        delete quotePayloadToInsert.discount_type;
      }

      if (quoteResult.error.message.includes("discount_percent")) {
        delete quotePayloadToInsert.discount_percent;
      }

      if (quoteResult.error.message.includes("discount_amount_mxn")) {
        delete quotePayloadToInsert.discount_amount_mxn;
      }

      if (quoteResult.error.message.includes("subtotal_mxn")) {
        delete quotePayloadToInsert.subtotal_mxn;
      }

      if (quoteResult.error.message.includes("taxable_base_mxn")) {
        delete quotePayloadToInsert.taxable_base_mxn;
      }

      if (quoteResult.error.message.includes("iva_mxn")) {
        delete quotePayloadToInsert.iva_mxn;
      }

      if (quoteResult.error.message.includes("total_mxn")) {
        delete quotePayloadToInsert.total_mxn;
      }

      if (quoteResult.error.message.includes("notes")) {
        delete quotePayloadToInsert.notes;
      }

      quoteResult = await supabase
        .from("quotes")
        .insert(quotePayloadToInsert)
        .select("id")
        .single();
    }

    const quote = quoteResult.data;
    const quoteError = quoteResult.error;

    if (quoteError || !quote) {
      const error = quoteError || { message: "No se recibió quote" };
      console.error("Error creando quote:", error);
      alert(
        "Error creando quote: " +
          JSON.stringify(error) +
          ("message" in error && error.message ? ` ${error.message}` : "")
      );
      setSavingQuote(false);
      return;
    }

    for (const [sectionIndex, section] of sections.entries()) {
      const sectionEquipmentTotal = getSectionEquipmentTotal(section);
      const sectionLaborTotal = getSectionLaborTotal(section);

      const { data: savedSection, error: sectionError } = await supabase
        .from("quote_sections")
        .insert({
          quote_id: quote.id,
          name: section.name,
          sort_order: sectionIndex,
          equipment_total: sectionEquipmentTotal,
          labor_total: sectionLaborTotal,
          total: sectionEquipmentTotal * numericExchangeRate + sectionLaborTotal,
        })
        .select("id")
        .single();

      if (sectionError || !savedSection) {
        const error = sectionError || { message: "No se recibió quote_section" };
        console.error("Error creando quote_sections:", error);
        alert(
          "Error creando quote_sections: " +
            JSON.stringify(error) +
            ("message" in error && error.message ? ` ${error.message}` : "")
        );
        setSavingQuote(false);
        return;
      }

      if (section.items.length === 0) {
        continue;
      }

      const itemsToInsert = section.items.map((item, itemIndex) => {
        const itemEquipmentUnitPriceUsd = getEquipmentUnitPriceUsd(
          item,
          numericExchangeRate
        );
        const itemEquipmentTotal = itemEquipmentUnitPriceUsd * item.quantity;
        const itemLaborTotal =
          item.labor_unit_sale_price * item.quantity;

        return {
          quote_id: quote.id,
          quote_section_id: savedSection.id,
          product_id: item.id,
          quantity: item.quantity,
          sale_currency: item.sale_currency,
          unit_equipment_price: item.calculated_sale_price,
          unit_equipment_price_usd: itemEquipmentUnitPriceUsd,
          unit_labor_price: item.labor_unit_sale_price,
          equipment_total: itemEquipmentTotal,
          equipment_total_usd: itemEquipmentTotal,
          labor_total: itemLaborTotal,
          line_total: itemEquipmentTotal * numericExchangeRate + itemLaborTotal,
          product_brand: item.brand,
          product_model: item.model,
          product_name: item.name,
          product_image_url: item.image_url,
          sort_order: itemIndex,
        };
      });

      const { error: itemsError } = await supabase
        .from("quote_items")
        .insert(itemsToInsert);

      if (itemsError) {
        console.error("Error creando quote_items:", itemsError);
        alert(
          "Error creando quote_items: " +
            JSON.stringify(itemsError) +
            (itemsError.message ? ` ${itemsError.message}` : "")
        );
        setSavingQuote(false);
        return;
      }
    }

    const { error: termsError } = await supabase
      .from("quote_terms_settings")
      .insert({
        quote_id: quote.id,
        ...termsSettings,
      });

    if (termsError) {
      console.error("Error creando quote_terms_settings:", termsError);
      alert(
        "Error creando quote_terms_settings: " +
          JSON.stringify(termsError) +
          (termsError.message ? ` ${termsError.message}` : "")
      );
      setSavingQuote(false);
      return;
    }

    if (selectedClientProjectId) {
      const projectId = Number(selectedClientProjectId);
      const { data: project, error: projectError } = await supabase
        .from("client_projects")
        .select("sales_stage")
        .eq("id", projectId)
        .maybeSingle();

      if (projectError) {
        console.error("Error leyendo etapa de oportunidad:", projectError);
        alert(
          "Cotización guardada, pero no se pudo leer la etapa de oportunidad: " +
            JSON.stringify(projectError) +
            (projectError.message ? ` ${projectError.message}` : "")
        );
        setSavingQuote(false);
        return;
      }

      if (canMarkProjectQuoted(project?.sales_stage)) {
        const { error: stageError } = await supabase
          .from("client_projects")
          .update({ sales_stage: "quoted" })
          .eq("id", projectId);

        if (stageError) {
          console.error("Error actualizando etapa de oportunidad:", stageError);
          alert(
            "Cotización guardada, pero no se pudo actualizar la etapa de oportunidad: " +
              JSON.stringify(stageError) +
              (stageError.message ? ` ${stageError.message}` : "")
          );
          setSavingQuote(false);
          return;
        }
      }
    }

    setSavingQuote(false);
    alert("Cotización guardada");
  }

  return (
    <main className="min-h-screen bg-[#0B0D0F] p-4 text-white md:p-8 xl:p-10">
      <section className="mb-10">
        <p className="text-[#9E1B32] tracking-[0.3em] text-sm mb-3">
          ALFA OS
        </p>

        <h1 className="mb-3 text-3xl font-bold sm:text-4xl">
          Nueva cotización
        </h1>

        <p className="text-[#B3B3B8]">
          Organiza productos por sistemas, zonas o alcances.
        </p>
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="text-2xl font-semibold mb-6">
          Cliente y proyecto
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <select
            className="bg-[#222228] border border-[#2A2A30] rounded-xl px-4 py-3 outline-none"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="">Seleccionar cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {String(client.client_number || "").padStart(3, "0")} -{" "}
                {client.name || "Sin nombre"}
              </option>
            ))}
          </select>

          <select
            className="bg-[#222228] border border-[#2A2A30] rounded-xl px-4 py-3 outline-none disabled:text-[#77777D]"
            value={selectedClientProjectId}
            onChange={(e) => setSelectedClientProjectId(e.target.value)}
            disabled={!selectedClientId}
          >
            <option value="">Seleccionar proyecto / oportunidad</option>
            {clientProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {String(project.project_number || "").padStart(3, "0")} -{" "}
                {project.name || "Sin nombre"}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="text-2xl font-semibold mb-4">
          Aclaraciones / Notas especiales
        </h2>

        <textarea
          className="min-h-44 w-full rounded-xl border border-[#2A2A30] bg-[#222228] p-4 leading-relaxed outline-none focus:border-[#9E1B32]"
          placeholder="Limitaciones, exclusiones, dependencias de terceros o consideraciones especiales de obra."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </section>

      <section className="mb-8 rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
        <h2 className="text-2xl font-semibold mb-6">
          Términos comerciales
        </h2>

        <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
          <label className="flex items-center gap-3 bg-[#222228] rounded-xl p-4">
            <input
              type="checkbox"
              checked={termsSettings.payment_100_advance}
              onChange={(e) =>
                updateTermsField("payment_100_advance", e.target.checked)
              }
            />
            Anticipo 100% del total
          </label>

          <label className="flex items-center gap-3 bg-[#222228] rounded-xl p-4">
            <input
              type="checkbox"
              checked={termsSettings.payment_100_equipment}
              onChange={(e) =>
                updateTermsField("payment_100_equipment", e.target.checked)
              }
            />
            100% equipos como anticipo
          </label>

          <label className="flex items-center gap-3 bg-[#222228] rounded-xl p-4">
            <input
              type="checkbox"
              checked={termsSettings.is_local_guadalajara}
              onChange={(e) =>
                updateTermsField("is_local_guadalajara", e.target.checked)
              }
            />
            Obra local Guadalajara
          </label>

          <label className="flex items-center gap-3 bg-[#222228] rounded-xl p-4">
            <input
              type="checkbox"
              checked={termsSettings.includes_travel_expenses}
              onChange={(e) =>
                updateTermsField("includes_travel_expenses", e.target.checked)
              }
            />
            Incluye viáticos
          </label>

          <label className="flex items-center gap-3 bg-[#222228] rounded-xl p-4">
            <input
              type="checkbox"
              checked={termsSettings.includes_conduit}
              onChange={(e) =>
                updateTermsField("includes_conduit", e.target.checked)
              }
            />
            Incluye canalizaciones
          </label>

          <label className="flex items-center gap-3 bg-[#222228] rounded-xl p-4">
            <input
              type="checkbox"
              checked={termsSettings.includes_cabling}
              onChange={(e) =>
                updateTermsField("includes_cabling", e.target.checked)
              }
            />
            Incluye cableado
          </label>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-8 xl:grid-cols-3">
        <div className="space-y-8 xl:col-span-2">
          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <h2 className="text-2xl font-semibold">
                Sistemas / secciones
              </h2>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="Nombre del sistema"
                  className="bg-[#222228] border border-[#2A2A30] rounded-xl px-4 py-3 outline-none"
                />

                <button
                  type="button"
                  onClick={addSection}
                  className="bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl px-5 py-3 font-semibold"
                >
                  Agregar
                </button>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              {sections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSectionId(section.id)}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold border ${
                    activeSectionId === section.id
                      ? "bg-[#9E1B32] border-[#9E1B32]"
                      : "bg-[#222228] border-[#2A2A30] text-[#B3B3B8]"
                  }`}
                >
                  {section.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {sections.map((section) => {
              const sectionEquipment = getSectionEquipmentTotal(section);
              const sectionLabor = getSectionLaborTotal(section);

              return (
                <div
                  key={section.id}
                  className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6"
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <input
                          value={section.name}
                          onChange={(e) =>
                            renameSection(section.id, e.target.value)
                          }
                          className="w-full rounded-xl border border-[#2A2A30] bg-[#222228] px-4 py-3 text-xl font-semibold outline-none focus:border-[#9E1B32] sm:max-w-md sm:text-2xl"
                        />

                        <button
                          type="button"
                          onClick={() => removeSection(section.id)}
                          className="bg-[#222228] hover:bg-[#2A2A30] border border-[#2A2A30] text-[#B3B3B8] rounded-xl px-5 py-3 font-semibold"
                        >
                          Eliminar
                        </button>
                      </div>

                      <p className="text-sm text-[#B3B3B8] mt-1">
                        {section.items.length} partidas
                      </p>
                    </div>

                    <div className="text-right text-sm">
                      <p>
                        Equipo: {formatCurrency(sectionEquipment, "USD")}
                      </p>

                      <p className="text-[#B3B3B8]">
                        MO: {formatCurrency(sectionLabor, "MXN")}
                      </p>
                    </div>
                  </div>

                  {section.items.length === 0 ? (
                    <p className="text-[#77777D]">
                      No hay productos en este sistema.
                    </p>
                  ) : (
                    <div className="space-y-4 overflow-x-auto">
                      {section.items.map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={() =>
                            setDraggingItem({
                              sectionId: section.id,
                              productId: item.id,
                            })
                          }
                          onDragOver={(event) => event.preventDefault()}
                          onDrop={() => handleItemDrop(section.id, item.id)}
                          onDragEnd={() => setDraggingItem(null)}
                          className={`grid min-w-[720px] grid-cols-[34px_70px_1fr_90px_130px_50px] items-center gap-4 rounded-xl bg-[#222228] p-4 ${
                            draggingItem?.sectionId === section.id &&
                            draggingItem.productId === item.id
                              ? "opacity-70 ring-1 ring-[#9E1B32]"
                              : ""
                          }`}
                        >
                          <span className="cursor-grab text-xl text-[#77777D] active:cursor-grabbing">
                            ☰
                          </span>

                          <div className="w-16 h-16 bg-[#151518] rounded-xl overflow-hidden flex items-center justify-center">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-xs text-[#77777D]">
                                Sin img
                              </span>
                            )}
                          </div>

                          <div>
                            <p className="font-semibold">
                              {item.brand} {item.model}
                            </p>

                            <p className="text-sm text-[#B3B3B8]">
                              {item.name}
                            </p>
                          </div>

                          <input
                            type="number"
                            min="1"
                            className="bg-[#151518] rounded-xl p-3 outline-none text-center"
                            value={item.quantity}
                            onChange={(e) =>
                              updateQuantity(
                                section.id,
                                item.id,
                                Number(e.target.value)
                              )
                            }
                          />

                          <div className="text-right text-sm">
                            <p>
                              {item.sale_currency}{" "}
                              {formatNumber(
                                item.calculated_sale_price * item.quantity
                              )}
                            </p>

                            <p className="text-[#B3B3B8]">
                              MO MXN{" "}
                              {formatNumber(
                                item.labor_unit_sale_price * item.quantity
                              )}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(section.id, item.id)}
                            className="w-10 h-10 bg-[#151518] hover:bg-[#2A2A30] rounded-xl text-[#B3B3B8]"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6">
            <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <h2 className="text-2xl font-semibold">
                Biblioteca de productos
              </h2>

              <div className="flex flex-col gap-3 sm:flex-row xl:justify-end">
                <QuickCreateProductButton
                  onProductCreated={handleProductCreated}
                />

                <input
                  type="text"
                  placeholder="Buscar producto..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-[#222228] border border-[#2A2A30] rounded-xl px-4 py-3 outline-none sm:w-80"
                />
              </div>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
              <select
                className="bg-[#222228] border border-[#2A2A30] rounded-xl px-4 py-3 outline-none"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">Todas las categorías</option>
                {productCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                className="bg-[#222228] border border-[#2A2A30] rounded-xl px-4 py-3 outline-none"
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
              >
                <option value="">Todos los tags</option>
                {productTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-3 bg-[#222228] border border-[#2A2A30] rounded-xl px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={favoritesOnly}
                  onChange={(e) => setFavoritesOnly(e.target.checked)}
                />
                Favoritos ALFA
              </label>
            </div>

            <p className="text-sm text-[#B3B3B8] mb-5">
              Se agregará al sistema seleccionado.
            </p>

            <div className="overflow-x-auto">
            <div className="grid min-w-[680px] grid-cols-[120px_1fr_160px_90px] gap-4 border-b border-[#2A2A30] px-2 pb-4 font-semibold text-[#B3B3B8]">
              <p>Imagen</p>
              <p>Descripción / Modelo</p>
              <p>Precio</p>
              <p>Acción</p>
            </div>

            <div className="divide-y divide-[#2A2A30]">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="grid min-w-[680px] grid-cols-[120px_1fr_160px_90px] items-center gap-4 px-2 py-5"
                >
                  <div className="w-20 h-20 bg-[#222228] rounded-xl overflow-hidden flex items-center justify-center">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[#77777D]">
                        Sin imagen
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-lg">
                        {product.brand} {product.model}
                      </p>
                      {product.is_favorite ? (
                        <span className="rounded-full bg-[#3B2D11] px-2 py-1 text-xs text-[#F4C66A]">
                          Favorito
                        </span>
                      ) : null}
                    </div>

                    <p className="text-[#B3B3B8]">
                      {product.name}
                    </p>
                    <p className="text-xs text-[#77777D] mt-1">
                      {product.product_categories?.name ||
                        product.category ||
                        "Sin categoría"}
                    </p>
                  </div>

                  <p className="font-semibold text-lg">
                    {formatCurrency(
                      product.calculated_sale_price,
                      product.sale_currency
                    )}
                  </p>

                  <button
                    type="button"
                    onClick={() => addProduct(product)}
                    className="w-14 h-14 bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl text-3xl font-light flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-[#1F1F24] bg-[#151518] p-4 sm:p-6 xl:sticky xl:top-8">
            <h2 className="text-2xl font-semibold mb-6">
              Resumen
            </h2>

            <div className="space-y-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#B3B3B8]">Sistemas</span>
                <span>{sections.length}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#B3B3B8]">Equipos USD</span>
                <span>{formatCurrency(equipmentTotalUSD, "USD")}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-[#B3B3B8]">Mano de obra MXN</span>
                <span>{formatCurrency(laborTotalMXN, "MXN")}</span>
              </div>

              <div className="flex justify-between items-center gap-4">
                <span className="text-[#B3B3B8]">Tipo de cambio</span>
                <input
                  className="w-24 bg-[#222228] border border-[#2A2A30] rounded-xl px-3 py-2 outline-none text-right"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                />
              </div>

              <div className="space-y-3 rounded-xl border border-[#2A2A30] bg-[#222228] p-4">
                <label className="block text-[#B3B3B8]">Descuento</label>
                <select
                  className="w-full rounded-xl bg-[#151518] px-3 py-2 outline-none"
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value)}
                >
                  <option value="none">Sin descuento</option>
                  <option value="percent">Porcentaje</option>
                  <option value="amount">Monto MXN</option>
                </select>

                {discountType === "percent" ? (
                  <input
                    className="w-full rounded-xl bg-[#151518] px-3 py-2 outline-none"
                    placeholder="% descuento"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                  />
                ) : null}

                {discountType === "amount" ? (
                  <input
                    className="w-full rounded-xl bg-[#151518] px-3 py-2 outline-none"
                    placeholder="Monto descuento MXN"
                    value={discountAmountMXN}
                    onChange={(e) => setDiscountAmountMXN(e.target.value)}
                  />
                ) : null}
              </div>

              <p className="text-xs text-[#77777D]">
                Tipo de cambio usado: {exchangeRateSource} ({exchangeRateDate})
              </p>

              <p className="text-xs text-[#77777D] leading-relaxed">
                Tipo de cambio informativo. Los pagos se liquidarán conforme al
                tipo de cambio DOF aplicable al día hábil de pago.
              </p>

              <div className="border-t border-[#2A2A30] pt-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-[#B3B3B8]">Subtotal MXN</span>
                  <span>{formatCurrency(subtotalMXN, "MXN")}</span>
                </div>

                {cappedDiscountMXN > 0 ? (
                  <div className="flex justify-between text-[#F4C66A]">
                    <span>Descuento</span>
                    <span>-{formatCurrency(cappedDiscountMXN, "MXN")}</span>
                  </div>
                ) : null}

                <div className="flex justify-between">
                  <span className="text-[#B3B3B8]">IVA 16%</span>
                  <span>{formatCurrency(ivaMXN, "MXN")}</span>
                </div>

                <div className="flex justify-between text-xl font-bold">
                  <span>Total MXN</span>
                  <span>{formatCurrency(totalMXN, "MXN")}</span>
                </div>

                <div className="rounded-xl border border-[#2A2A30] bg-[#101114] p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#77777D]">
                    Informacion interna
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[#B3B3B8]">Margen operativo</span>
                      <span className={operatingMarginColorClass}>
                        {formatCurrency(operatingMarginMXN, "MXN")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#B3B3B8]">Margen operativo %</span>
                      <span className={operatingMarginColorClass}>
                        {operatingMarginPercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-xs font-normal leading-relaxed text-[#77777D]">
                  El total en MXN es estimado. El tipo de cambio aplicable será
                  el publicado por el DOF el día hábil de pago.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveQuote}
              disabled={savingQuote}
              className="w-full mt-6 bg-[#9E1B32] hover:bg-[#B91C3C] rounded-xl py-4 font-semibold"
            >
              {savingQuote ? "Guardando..." : "Guardar cotización"}
            </button>
          </div>
        </aside>
      </section>
    </main>
  );
}
