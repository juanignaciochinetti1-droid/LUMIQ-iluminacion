// Cálculo de precios y totales. Lo usan el servidor (fuente de verdad) y la UI (vista previa).

export type CondicionPago = "contado" | "lista" | "cuenta_corriente";

export const CONDICION_LABELS: Record<CondicionPago, string> = {
  contado: "Contado",
  lista: "Precio de lista",
  cuenta_corriente: "Cuenta corriente",
};

export function toNum(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : 0;
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Limita un porcentaje al rango 0-100. */
export function clampPct(v: unknown): number {
  return Math.min(100, Math.max(0, toNum(v)));
}

export function precioContado(precioLista: unknown, descuentoContadoPct: unknown): number {
  return round2(toNum(precioLista) * (1 - clampPct(descuentoContadoPct) / 100));
}

/** Precio unitario sugerido de un producto según la condición de pago. */
export function precioSegunCondicion(
  producto: { precioVenta?: unknown; descuentoContado?: unknown },
  condicion: CondicionPago
): number {
  return condicion === "contado"
    ? precioContado(producto.precioVenta, producto.descuentoContado)
    : round2(toNum(producto.precioVenta));
}

export type LineaCalculo = { cantidad: unknown; precioUnitario: unknown; descuento?: unknown };

export function subtotalLinea(l: LineaCalculo): number {
  return round2(toNum(l.cantidad) * toNum(l.precioUnitario) * (1 - clampPct(l.descuento) / 100));
}

export function calcularTotales(lineas: LineaCalculo[], descuentoGeneralPct: unknown) {
  const subtotal = round2(lineas.reduce((s, l) => s + subtotalLinea(l), 0));
  const descuentoMonto = round2(subtotal * (clampPct(descuentoGeneralPct) / 100));
  return { subtotal, descuentoMonto, total: round2(subtotal - descuentoMonto) };
}
