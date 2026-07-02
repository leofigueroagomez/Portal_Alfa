export type QuoteDiagnosticBlock = {
  id: string;
  title: string;
  text: string;
  imageUrl: string;
};

export type SavedQuoteDiagnosticBlock = {
  id: number;
  title: string | null;
  text: string | null;
  image_url: string | null;
  sort_order: number | null;
};

export function createEmptyDiagnosticBlock(): QuoteDiagnosticBlock {
  return {
    id: crypto.randomUUID(),
    title: "",
    text: "",
    imageUrl: "",
  };
}

export function isUsefulDiagnosticBlock(
  block: Pick<QuoteDiagnosticBlock, "title" | "text" | "imageUrl">
) {
  return Boolean(
    block.title.trim() || block.text.trim() || block.imageUrl.trim()
  );
}

export function normalizeDiagnosticBlocks(blocks: QuoteDiagnosticBlock[]) {
  return blocks
    .map((block) => ({
      ...block,
      title: block.title.trim(),
      text: block.text.trim(),
      imageUrl: block.imageUrl.trim(),
    }))
    .filter(isUsefulDiagnosticBlock);
}

export function hydrateDiagnosticBlocks(
  blocks: SavedQuoteDiagnosticBlock[] | null | undefined
): QuoteDiagnosticBlock[] {
  return (blocks || [])
    .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
    .map((block) => ({
      id: String(block.id),
      title: block.title || "",
      text: block.text || "",
      imageUrl: block.image_url || "",
    }));
}
