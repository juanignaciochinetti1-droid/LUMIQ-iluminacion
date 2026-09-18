export { toNum } from "@shared/pricing";

/** Fecha de hoy (YYYY-MM-DD) en hora local; toISOString() usa UTC y de noche daría el día siguiente. */
export function hoy(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function money(v: unknown): string {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "")) || 0;
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Cantidades: hasta 3 decimales, sin ceros de más. */
export function qty(v: unknown): string {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "")) || 0;
  return n.toLocaleString("es-AR", { maximumFractionDigits: 3 });
}

export function fechaAR(f: string): string {
  return new Date(f + "T00:00:00").toLocaleDateString("es-AR");
}
