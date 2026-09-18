import { useMemo } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SearchSelect, type SearchOption } from "@/components/SearchSelect";
import type { ProductoRow } from "@/lib/print";
import { money, qty } from "@/lib/format";
import { calcularTotales, precioContado, precioSegunCondicion, subtotalLinea, toNum, type CondicionPago } from "@shared/pricing";

/** Una fila del formulario de venta o cotización (todo como texto, tal cual se tipea). */
export type Linea = {
  productoId: string;
  cantidad: string;
  precioUnitario: string;
  descuento: string;
  /** true si el usuario tocó el precio: ya no se pisa al cambiar la condición de pago */
  precioManual: boolean;
};

export const LINEAS_INICIALES = 10;

export const lineaVacia = (): Linea => ({ productoId: "", cantidad: "", precioUnitario: "", descuento: "", precioManual: false });

export const lineasIniciales = (n = LINEAS_INICIALES): Linea[] => Array.from({ length: n }, lineaVacia);

/** Convierte líneas guardadas en filas del formulario, completando hasta `minimo` filas. */
export function lineasDesdeDocumento(
  items: { productoId: number; cantidad: string; precioUnitario: string; descuento: string }[],
  minimo = LINEAS_INICIALES,
): Linea[] {
  const filas: Linea[] = items.map(i => ({
    productoId: String(i.productoId),
    cantidad: String(parseFloat(i.cantidad)),
    precioUnitario: String(parseFloat(i.precioUnitario)),
    descuento: toNum(i.descuento) ? String(parseFloat(i.descuento)) : "",
    precioManual: true, // se respeta el precio con el que se guardó
  }));
  return [...filas, ...lineasIniciales(Math.max(0, minimo - filas.length))];
}

/** Recalcula el precio de las filas que no se editaron a mano (al cambiar la condición de pago). */
export function repreciar(lineas: Linea[], productos: ProductoRow[], condicion: CondicionPago): Linea[] {
  return lineas.map(l => {
    const p = productos.find(x => String(x.id) === l.productoId);
    return p && !l.precioManual ? { ...l, precioUnitario: String(precioSegunCondicion(p, condicion)) } : l;
  });
}

/** Solo las filas con producto elegido, listas para enviar al servidor. */
export function lineasParaEnviar(lineas: Linea[]) {
  return lineas
    .filter(l => l.productoId)
    .map(l => ({
      productoId: parseInt(l.productoId),
      cantidad: toNum(l.cantidad),
      precioUnitario: toNum(l.precioUnitario),
      descuento: toNum(l.descuento),
    }));
}

export function LineasEditor({
  lineas, onChange, productos, condicion, controlarStock = false,
}: {
  lineas: Linea[];
  onChange: (lineas: Linea[]) => void;
  productos: ProductoRow[];
  condicion: CondicionPago;
  /** Avisa cuando la cantidad supera el stock (ventas) */
  controlarStock?: boolean;
}) {
  const opciones = useMemo<SearchOption[]>(() => productos.map(p => ({
    value: String(p.id),
    label: p.nombre,
    search: `${p.codigo ?? ""} ${p.codigoProveedor ?? ""}`,
    hint: `${p.codigo ? `${p.codigo} · ` : ""}Stock ${qty(p.stock)} ${p.unidad} · Lista ${money(p.precioVenta)} · Contado ${money(precioContado(p.precioVenta, p.descuentoContado))}`,
  })), [productos]);

  const cambiar = (i: number, cambios: Partial<Linea>) =>
    onChange(lineas.map((l, idx) => (idx === i ? { ...l, ...cambios } : l)));

  const elegirProducto = (i: number, productoId: string) => {
    const p = productos.find(x => String(x.id) === productoId);
    if (!p) return;
    cambiar(i, {
      productoId,
      cantidad: lineas[i].cantidad || "1",
      precioUnitario: String(precioSegunCondicion(p, condicion)),
      precioManual: false,
    });
  };

  const quitar = (i: number) => {
    const resto = lineas.filter((_, idx) => idx !== i);
    onChange(resto.length ? resto : [lineaVacia()]);
  };

  // Un mismo producto puede estar en varias filas: el stock se compara contra la suma.
  const pedidoPorProducto = new Map<string, number>();
  lineas.forEach(l => { if (l.productoId) pedidoPorProducto.set(l.productoId, (pedidoPorProducto.get(l.productoId) ?? 0) + toNum(l.cantidad)); });

  return (
    <div className="space-y-2">
      <div className="hidden md:grid grid-cols-[28px_minmax(0,1fr)_88px_110px_72px_110px_32px] gap-2 text-xs font-medium text-gray-500 px-1">
        <span>#</span><span>Producto</span><span>Cantidad</span><span>Precio unit.</span><span>Desc. %</span><span className="text-right">Subtotal</span><span />
      </div>
      <div className="space-y-1.5 max-h-[42vh] overflow-y-auto pr-1">
        {lineas.map((l, i) => {
          const producto = productos.find(p => String(p.id) === l.productoId);
          const sinStock = controlarStock && !!producto && (pedidoPorProducto.get(l.productoId) ?? 0) > toNum(producto.stock) + 0.0005;
          return (
            <div key={i} className="grid grid-cols-[28px_minmax(0,1fr)_88px_110px_72px_110px_32px] gap-2 items-center">
              <span className="text-xs text-gray-400">{i + 1}</span>
              <SearchSelect options={opciones} value={l.productoId} onChange={v => elegirProducto(i, v)} placeholder="Elegir producto..." />
              <Input
                type="number" step="0.001" min="0" placeholder="0"
                value={l.cantidad}
                onChange={e => cambiar(i, { cantidad: e.target.value })}
                className={sinStock ? "border-red-400" : ""}
                title={sinStock ? `Stock disponible: ${qty(producto?.stock)}` : undefined}
              />
              <Input
                type="number" step="0.01" min="0" placeholder="0.00"
                value={l.precioUnitario}
                onChange={e => cambiar(i, { precioUnitario: e.target.value, precioManual: true })}
              />
              <Input
                type="number" step="0.1" min="0" max="100" placeholder="0"
                value={l.descuento}
                onChange={e => cambiar(i, { descuento: e.target.value })}
              />
              <span className="text-right text-sm font-medium tabular-nums">
                {l.productoId ? money(subtotalLinea(l)) : ""}
              </span>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-red-600" onClick={() => quitar(i)} title="Quitar línea">
                <X className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lineas, lineaVacia()])}>
        <Plus className="w-4 h-4 mr-1" /> Agregar línea
      </Button>
    </div>
  );
}

/** Subtotal, descuento general y total de un documento, en vivo. */
export function ResumenTotales({ lineas, descuentoGeneral }: { lineas: Linea[]; descuentoGeneral: string }) {
  const validas = lineas.filter(l => l.productoId);
  const { subtotal, descuentoMonto, total } = calcularTotales(validas, descuentoGeneral);
  return (
    <Card className="bg-orange-50 border-orange-200">
      <CardContent className="pt-4 space-y-1">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal ({validas.length} artículo{validas.length === 1 ? "" : "s"})</span><span>{money(subtotal)}</span>
        </div>
        {descuentoMonto > 0 && (
          <div className="flex justify-between text-sm text-gray-600"><span>Descuento general</span><span>-{money(descuentoMonto)}</span></div>
        )}
        <div className="flex justify-between items-center pt-1">
          <span className="text-lg font-semibold">Total:</span>
          <span className="text-2xl font-bold text-orange-600">{money(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
