// Impresión: arma el HTML de cada documento y lo manda a imprimir en un iframe oculto.

import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../server/routers";
import { CONDICION_LABELS, toNum } from "@shared/pricing";
import { fechaAR, money, qty } from "./format";

type Out = inferRouterOutputs<AppRouter>;
export type VentaRow = Out["ventas"]["list"][number];
export type CotizacionRow = Out["cotizaciones"]["list"][number];
export type ProduccionRow = Out["produccion"]["list"][number];
export type ProductoRow = Out["productos"]["list"][number];
export type ClienteRow = Out["clientes"]["list"][number];
export type MovimientoRow = Out["cuentaCorriente"]["movimientos"][number];

export const ENTREGA_LABELS: Record<string, string> = {
  retiro_local: "Retiro en el local",
  mercado_libre: "Mercado Libre",
  envio: "Envío",
};

/** Imprime un documento HTML completo sin salir de la aplicación. */
export function printHtml(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  iframe.onload = async () => {
    const win = iframe.contentWindow;
    if (!win) return;
    // Esperar el logo antes de abrir el diálogo de impresión.
    await Promise.all(
      Array.from(win.document.images).map(img =>
        img.complete ? null : new Promise(resolve => { img.onload = img.onerror = () => resolve(null); })
      )
    );
    win.focus();
    win.print();
    setTimeout(() => iframe.remove(), 1000);
  };
  iframe.srcdoc = html;
  document.body.appendChild(iframe);
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const ESTILOS = `
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #222; margin: 0; }
  .top { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #ff8c42; padding-bottom: 10px; margin-bottom: 14px; }
  .marca { display: flex; align-items: center; gap: 10px; }
  .marca img { height: 46px; }
  .marca b { font-size: 22px; letter-spacing: 2px; color: #ff8c42; }
  .doc { text-align: right; }
  .doc h1 { margin: 0; font-size: 18px; color: #ff8c42; }
  .doc div { margin-top: 3px; }
  .caja { border: 1px solid #ddd; border-radius: 4px; padding: 8px 10px; margin-bottom: 12px; }
  .caja h2 { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; color: #ff8c42; letter-spacing: 1px; }
  .fila { display: flex; gap: 24px; flex-wrap: wrap; }
  .fila span b { color: #555; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; }
  th { background: #ff8c42; color: #fff; text-align: left; padding: 6px 7px; font-size: 11px; }
  td { padding: 6px 7px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
  .r { text-align: right; }
  tfoot td { border: 0; }
  .totales { margin-left: auto; width: 260px; }
  .totales div { display: flex; justify-content: space-between; padding: 3px 0; }
  .totales .total { border-top: 2px solid #ff8c42; margin-top: 4px; padding-top: 6px; font-size: 16px; font-weight: bold; color: #ff8c42; }
  .coment { border-left: 3px solid #ff8c42; background: #fff7ef; padding: 6px 10px; margin: 8px 0; white-space: pre-wrap; }
  .firmas { display: flex; justify-content: space-between; margin-top: 70px; }
  .firmas div { width: 42%; border-top: 1px solid #555; text-align: center; padding-top: 4px; }
  .pie { margin-top: 18px; text-align: center; color: #999; font-size: 10px; }
  .chico { font-size: 10px; color: #777; }
  tr { page-break-inside: avoid; }
`;

function documento(titulo: string, numero: string, fecha: string, cuerpo: string) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${esc(titulo)} ${esc(numero)}</title><style>${ESTILOS}</style></head>
<body>
  <div class="top">
    <div class="marca"><img src="${location.origin}/logo.png" alt=""><b>LUMIQ</b></div>
    <div class="doc"><h1>${esc(titulo)}</h1>${numero ? `<div><b>N° ${esc(numero)}</b></div>` : ""}<div>Fecha: ${esc(fecha)}</div></div>
  </div>
  ${cuerpo}
  <div class="pie">Documento generado por el Sistema de Gestión LUMIQ</div>
</body></html>`;
}

type Producto = Pick<ProductoRow, "id" | "codigo" | "nombre" | "unidad">;

const nombreProducto = (productos: Producto[], id: number) => productos.find(p => p.id === id)?.nombre ?? `Producto ${id}`;
const codigoProducto = (productos: Producto[], id: number) => productos.find(p => p.id === id)?.codigo ?? "";
const unidadProducto = (productos: Producto[], id: number) => productos.find(p => p.id === id)?.unidad ?? "";

function bloqueCliente(c: { nombre?: string | null; dni?: string | null; telefono?: string | null; direccion?: string | null; localidad?: string | null; entrega?: string | null }) {
  const dato = (label: string, v?: string | null) => (v ? `<span><b>${label}:</b> ${esc(v)}</span>` : "");
  return `<div class="caja"><h2>Cliente</h2><div class="fila">
    ${dato("Nombre", c.nombre)}${dato("DNI/CUIT", c.dni)}${dato("Teléfono", c.telefono)}
    ${dato("Dirección", c.direccion)}${dato("Localidad", c.localidad)}${dato("Entrega", c.entrega ? ENTREGA_LABELS[c.entrega] : null)}
  </div></div>`;
}

type LineaDoc = { productoId: number; cantidad: string; precioUnitario: string; descuento: string; subtotal: string };

function tablaLineas(lineas: LineaDoc[], productos: Producto[]) {
  const filas = lineas.map(l => `<tr>
    <td>${esc(codigoProducto(productos, l.productoId))}</td>
    <td>${esc(nombreProducto(productos, l.productoId))}</td>
    <td class="r">${qty(l.cantidad)}</td>
    <td class="r">${money(l.precioUnitario)}</td>
    <td class="r">${toNum(l.descuento) ? `${qty(l.descuento)}%` : ""}</td>
    <td class="r">${money(l.subtotal)}</td></tr>`).join("");
  return `<table><thead><tr><th>Código</th><th>Producto</th><th class="r">Cant.</th><th class="r">Precio unit.</th><th class="r">Desc.</th><th class="r">Subtotal</th></tr></thead><tbody>${filas}</tbody></table>`;
}

function totales(d: { subtotal: string; descuento: string; total: string }) {
  const desc = toNum(d.subtotal) - toNum(d.total);
  return `<div class="totales">
    <div><span>Subtotal</span><span>${money(d.subtotal)}</span></div>
    ${toNum(d.descuento) ? `<div><span>Descuento ${qty(d.descuento)}%</span><span>-${money(desc)}</span></div>` : ""}
    <div class="total"><span>TOTAL</span><span>${money(d.total)}</span></div>
  </div>`;
}

const comentarios = (c?: string | null) => (c ? `<div class="coment"><b>Comentarios:</b> ${esc(c)}</div>` : "");

/** Comprobante de venta (con precios). */
export function htmlVenta(v: VentaRow, productos: Producto[]) {
  return documento("Comprobante de venta", String(v.numero), fechaAR(v.fecha), `
    ${bloqueCliente({ nombre: v.clienteNombre, dni: v.dniCuit, direccion: v.direccion, localidad: v.localidad, entrega: v.entrega })}
    <div class="chico" style="margin-bottom:4px">Condición de pago: ${esc(CONDICION_LABELS[v.condicionPago])}${v.remitoNumero ? ` · Remito N° ${v.remitoNumero}` : ""}</div>
    ${tablaLineas(v.items, productos)}
    ${totales(v)}
    ${comentarios(v.comentarios)}`);
}

/** Remito: detalle de lo entregado, sin precios, con espacio para firma. */
export function htmlRemito(v: VentaRow, productos: Producto[], remitoNumero: number) {
  const filas = v.items.map(l => `<tr>
    <td>${esc(codigoProducto(productos, l.productoId))}</td>
    <td>${esc(nombreProducto(productos, l.productoId))}</td>
    <td class="r">${qty(l.cantidad)} ${esc(unidadProducto(productos, l.productoId))}</td></tr>`).join("");
  return documento("Remito", String(remitoNumero), fechaAR(v.fecha), `
    ${bloqueCliente({ nombre: v.clienteNombre, dni: v.dniCuit, direccion: v.direccion, localidad: v.localidad, entrega: v.entrega })}
    <div class="chico" style="margin-bottom:4px">Ref. venta N° ${v.numero}</div>
    <table><thead><tr><th>Código</th><th>Producto</th><th class="r">Cantidad</th></tr></thead><tbody>${filas}</tbody></table>
    ${comentarios(v.comentarios)}
    <div class="firmas"><div>Entregó</div><div>Recibí conforme</div></div>`);
}

export function htmlCotizacion(c: CotizacionRow, productos: Producto[], cliente?: ClienteRow) {
  return documento("Cotización", String(c.numero), fechaAR(c.fecha), `
    ${bloqueCliente({ nombre: cliente?.nombre ?? c.clienteNombre, dni: cliente?.dni, telefono: cliente?.telefono, direccion: cliente?.direccion })}
    <div class="chico" style="margin-bottom:4px">Condición de pago: ${esc(CONDICION_LABELS[c.condicionPago])}</div>
    ${tablaLineas(c.items, productos)}
    ${totales(c)}
    ${comentarios(c.comentarios)}
    <div class="chico">Los precios pueden variar sin previo aviso. Cotización sujeta a disponibilidad de stock.</div>`);
}

const detalleItems = (v: { items: LineaDoc[] }, productos: Producto[]) =>
  v.items.map(l => `${qty(l.cantidad)} × ${esc(nombreProducto(productos, l.productoId))}`).join("<br>");

export function htmlListadoVentas(ventas: VentaRow[], productos: Producto[], filtros: string) {
  const total = ventas.reduce((s, v) => s + toNum(v.total), 0);
  const filas = ventas.map(v => `<tr>
    <td>${v.numero}</td><td>${fechaAR(v.fecha)}</td>
    <td>${esc(v.clienteNombre || v.dniCuit || "-")}${v.localidad ? `<div class="chico">${esc(v.localidad)}</div>` : ""}</td>
    <td>${esc(v.entrega ? ENTREGA_LABELS[v.entrega] : "-")}</td>
    <td>${esc(CONDICION_LABELS[v.condicionPago])}</td>
    <td>${detalleItems(v, productos)}${v.comentarios ? `<div class="chico"><i>${esc(v.comentarios)}</i></div>` : ""}</td>
    <td class="r">${money(v.total)}</td></tr>`).join("");
  return documento("Listado de ventas", "", new Date().toLocaleDateString("es-AR"), `
    ${filtros ? `<div class="chico" style="margin-bottom:6px">Filtros: ${esc(filtros)}</div>` : ""}
    <table><thead><tr><th>N°</th><th>Fecha</th><th>Cliente</th><th>Entrega</th><th>Pago</th><th>Detalle</th><th class="r">Total</th></tr></thead>
    <tbody>${filas}</tbody>
    <tfoot><tr><td colspan="6" class="r"><b>${ventas.length} venta(s) — TOTAL</b></td><td class="r"><b>${money(total)}</b></td></tr></tfoot></table>`);
}

export function htmlListadoRemitos(ventas: VentaRow[], productos: Producto[], filtros: string) {
  const filas = ventas.map(v => `<tr>
    <td>${esc(v.remitoNumero ?? v.remito)}</td><td>${fechaAR(v.fecha)}</td><td>${v.numero}</td>
    <td>${esc(v.clienteNombre || v.dniCuit || "-")}</td>
    <td>${esc([v.direccion, v.localidad].filter(Boolean).join(", ") || "-")}</td>
    <td>${esc(v.entrega ? ENTREGA_LABELS[v.entrega] : "-")}</td>
    <td>${detalleItems(v, productos)}</td></tr>`).join("");
  return documento("Listado de remitos", "", new Date().toLocaleDateString("es-AR"), `
    ${filtros ? `<div class="chico" style="margin-bottom:6px">Filtros: ${esc(filtros)}</div>` : ""}
    <table><thead><tr><th>Remito N°</th><th>Fecha</th><th>Venta N°</th><th>Cliente</th><th>Dirección</th><th>Entrega</th><th>Detalle</th></tr></thead>
    <tbody>${filas}</tbody></table>
    <div class="chico">${ventas.length} remito(s)</div>`);
}

export function htmlListadoProduccion(rows: ProduccionRow[], productos: Producto[], filtros: string) {
  const unidades = rows.reduce((s, r) => s + toNum(r.cantidad), 0);
  const filas = rows.map(r => `<tr>
    <td>${fechaAR(r.fecha)}</td><td>${esc(codigoProducto(productos, r.productoId))}</td>
    <td>${esc(nombreProducto(productos, r.productoId))}</td>
    <td class="r">${qty(r.cantidad)}</td><td>${esc(r.responsable)}</td><td class="r">${money(r.costoMP)}</td></tr>`).join("");
  return documento("Listado de producción", "", new Date().toLocaleDateString("es-AR"), `
    ${filtros ? `<div class="chico" style="margin-bottom:6px">Filtros: ${esc(filtros)}</div>` : ""}
    <table><thead><tr><th>Fecha</th><th>Código</th><th>Producto</th><th class="r">Cantidad</th><th>Responsable</th><th class="r">Costo MP</th></tr></thead>
    <tbody>${filas}</tbody>
    <tfoot><tr><td colspan="3" class="r"><b>${rows.length} registro(s) — TOTAL UNIDADES</b></td><td class="r"><b>${qty(unidades)}</b></td><td colspan="2"></td></tr></tfoot></table>`);
}

export function htmlEstadoCuenta(cliente: ClienteRow, movimientos: MovimientoRow[]) {
  const filas = movimientos.map(m => `<tr>
    <td>${fechaAR(m.fecha)}</td><td>${esc(m.concepto)}</td>
    <td class="r">${m.tipo === "cargo" ? money(m.monto) : ""}</td>
    <td class="r">${m.tipo === "pago" ? money(m.monto) : ""}</td>
    <td class="r">${money(m.saldoAcumulado)}</td></tr>`).join("");
  const saldo = movimientos.length ? movimientos[movimientos.length - 1].saldoAcumulado : 0;
  return documento("Estado de cuenta corriente", "", new Date().toLocaleDateString("es-AR"), `
    ${bloqueCliente(cliente)}
    <table><thead><tr><th>Fecha</th><th>Concepto</th><th class="r">Cargos</th><th class="r">Pagos</th><th class="r">Saldo</th></tr></thead><tbody>${filas}</tbody></table>
    <div class="totales"><div class="total"><span>SALDO</span><span>${money(saldo)}</span></div></div>`);
}
