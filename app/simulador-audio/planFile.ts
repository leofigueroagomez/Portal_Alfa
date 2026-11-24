"use client";

/**
 * Carga del plano en el navegador. El archivo no se sube a ningun servidor:
 * se convierte en una imagen local (object URL) que solo vive en la pestaña.
 */

export type LoadedPlan = {
  src: string;
  width: number;
  height: number;
  fileName: string;
  pageCount: number;
  page: number;
};

export const MAX_PLAN_FILE_BYTES = 40 * 1024 * 1024;
const PDF_TARGET_WIDTH = 2400;
const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export class PlanFileError extends Error {}

function isPdf(file: File) {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name);
}

function readImageSize(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new PlanFileError("No pudimos abrir esa imagen."));
    image.src = src;
  });
}

async function renderPdfPage(file: File, page: number): Promise<LoadedPlan> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;

  try {
    const pageNumber = Math.min(Math.max(1, page), pdf.numPages);
    const pdfPage = await pdf.getPage(pageNumber);
    const base = pdfPage.getViewport({ scale: 1 });
    const scale = Math.min(4, PDF_TARGET_WIDTH / base.width);
    const viewport = pdfPage.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new PlanFileError("Tu navegador no pudo dibujar el plano.");

    await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.9)
    );
    if (!blob) throw new PlanFileError("Tu navegador no pudo dibujar el plano.");

    return {
      src: URL.createObjectURL(blob),
      width: canvas.width,
      height: canvas.height,
      fileName: file.name,
      pageCount: pdf.numPages,
      page: pageNumber,
    };
  } finally {
    await pdf.destroy();
  }
}

export async function loadPlanFile(file: File, page = 1): Promise<LoadedPlan> {
  if (file.size > MAX_PLAN_FILE_BYTES) {
    throw new PlanFileError("El archivo pesa más de 40 MB. Exporta el plano más ligero.");
  }

  if (isPdf(file)) {
    try {
      return await renderPdfPage(file, page);
    } catch (error) {
      if (error instanceof PlanFileError) throw error;
      throw new PlanFileError("No pudimos leer ese PDF. Prueba con una imagen del plano.");
    }
  }

  if (!IMAGE_TYPES.includes(file.type)) {
    throw new PlanFileError("Sube el plano en PDF, JPG o PNG.");
  }

  const src = URL.createObjectURL(file);

  try {
    const size = await readImageSize(src);
    return { src, ...size, fileName: file.name, pageCount: 1, page: 1 };
  } catch (error) {
    URL.revokeObjectURL(src);
    throw error;
  }
}
