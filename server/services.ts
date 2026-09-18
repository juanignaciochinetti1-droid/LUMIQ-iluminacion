// Lógica de negocio con efectos sobre stock, numeración y cuenta corriente.
// Todo corre dentro de transacciones síncronas: si algo falla, no queda nada a medias.

import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import {
  db, runInTransaction, siguienteNumero, createCliente,
} from "./db";
import {
  productos, recetas, produccion, clientes, movimientosCuenta,
  ventas, ventaItems, cotizaciones, cotizacionItems,
  type CondicionPago, ESTADOS_COTIZACION,
} from "../drizzle/schema";
import { calcularTotales, subtotalLinea, toNum, round2, clampPct } from "../shared/pricing";

const bad = (message: string) => new TRPCError({ code: "BAD_REQUEST", message });
const notFound = (message: string) => new TRPCError({ code: "NOT_FOUND", message });
const nowIso = () => new Date().toISOString();
const fmt = (n: number) => n.toFixed(3);

// ==================== STOCK ====================
function getProducto(id: number) {
  const p = db.select().from(productos).where(eq(productos.id, id)).get();
  if (!p) throw notFound(`Producto no encontrado (id: ${id})`);
  return p;
}

/** Suma (o resta, si `delta` es negativo) stock. Falla si el stock quedaría negativo. */
function ajustarStock(productoId: number, delta: number) {
  const p = getProducto(productoId);
  const actual = toNum(p.stock);
  const nuevo = Math.round((actual + delta) * 1000) / 1000;
  if (nuevo < 0) throw bad(`Stock insuficiente de "${p.nombre}". Disponible: ${fmt(actual)} ${p.unidad}`);
  db.update(productos).set({ stock: String(nuevo), updatedAt: nowIso() }).where(eq(productos.id, productoId)).run();
}

// ==================== CLIENTES ====================
export type NuevoCliente = {
  nombre: string;
  dni?: string;
  telefono?: string;
  direccion?: string;
  tieneCuentaCorriente?: boolean;
};

function getCliente(id: number) {
  const c = db.select().from(clientes).where(eq(clientes.id, id)).get();
  if (!c) throw notFound("Cliente no encontrado");
  return c;
}

/** Devuelve el id del cliente elegido, o crea uno nuevo si se cargaron sus datos en el momento. */
function resolverCliente(clienteId?: number | null, nuevo?: NuevoCliente | null): number | null {
  if (nuevo) {
    return createCliente({
      nombre: nuevo.nombre.trim(),
      dni: nuevo.dni?.trim() || null,
      telefono: nuevo.telefono?.trim() || null,
      direccion: nuevo.direccion?.trim() || null,
      tieneCuentaCorriente: nuevo.tieneCuentaCorriente ? 1 : 0,
    });
  }
  if (clienteId) {
    getCliente(clienteId);
    return clienteId;
  }
  return null;
}

export function crearCliente(input: NuevoCliente) {
  return runInTransaction(() => resolverCliente(null, input));
}

export function actualizarCliente(id: number, input: NuevoCliente) {
  return runInTransaction(() => {
    const actual = getCliente(id);
    if (actual.tieneCuentaCorriente && !input.tieneCuentaCorriente && saldoCliente(id) !== 0) {
      throw bad("No se puede quitar la cuenta corriente: el cliente tiene saldo pendiente.");
    }
    db.update(clientes).set({
      nombre: input.nombre.trim(),
      dni: input.dni?.trim() || null,
      telefono: input.telefono?.trim() || null,
      direccion: input.direccion?.trim() || null,
      tieneCuentaCorriente: input.tieneCuentaCorriente ? 1 : 0,
      updatedAt: nowIso(),
    }).where(eq(clientes.id, id)).run();
  });
}

export function eliminarCliente(id: number) {
  runInTransaction(() => {
    getCliente(id);
    const usos =
      db.select({ n: sql<number>`count(*)` }).from(ventas).where(eq(ventas.clienteId, id)).get()!.n +
      db.select({ n: sql<number>`count(*)` }).from(cotizaciones).where(eq(cotizaciones.clienteId, id)).get()!.n +
      db.select({ n: sql<number>`count(*)` }).from(movimientosCuenta).where(eq(movimientosCuenta.clienteId, id)).get()!.n;
    if (usos > 0) throw bad("No se puede eliminar: el cliente tiene ventas, cotizaciones o movimientos registrados.");
    db.delete(clientes).where(eq(clientes.id, id)).run();
  });
}

// ==================== CUENTA CORRIENTE ====================
export function saldoCliente(clienteId: number): number {
  const rows = db.select().from(movimientosCuenta).where(eq(movimientosCuenta.clienteId, clienteId)).all();
  return round2(rows.reduce((s, m) => s + (m.tipo === "cargo" ? 1 : -1) * toNum(m.monto), 0));
}

export function listarMovimientos(clienteId: number) {
  const rows = db.select().from(movimientosCuenta)
    .where(eq(movimientosCuenta.clienteId, clienteId))
    .orderBy(movimientosCuenta.fecha, movimientosCuenta.id).all();
  let acumulado = 0;
  return rows.map(m => {
    acumulado = round2(acumulado + (m.tipo === "cargo" ? 1 : -1) * toNum(m.monto));
    return { ...m, saldoAcumulado: acumulado };
  });
}

export function registrarPago(input: { clienteId: number; fecha: string; monto: number; concepto?: string }) {
  runInTransaction(() => {
    const c = getCliente(input.clienteId);
    if (!c.tieneCuentaCorriente) throw bad("El cliente no tiene cuenta corriente habilitada.");
    db.insert(movimientosCuenta).values({
      clienteId: input.clienteId,
      fecha: input.fecha,
      tipo: "pago",
      concepto: input.concepto?.trim() || "Pago",
      monto: String(round2(input.monto)),
    }).run();
  });
}

export function eliminarMovimiento(id: number) {
  runInTransaction(() => {
    const m = db.select().from(movimientosCuenta).where(eq(movimientosCuenta.id, id)).get();
    if (!m) throw notFound("Movimiento no encontrado");
    if (m.tipo === "cargo") throw bad("Los cargos se eliminan borrando la venta que los generó.");
    db.delete(movimientosCuenta).where(eq(movimientosCuenta.id, id)).run();
  });
}

// ==================== PRODUCCION ====================
export type ProduccionInput = {
  fecha: string;
  productoId: number;
  cantidad: number;
  responsable: string;
  costoMP: number;
};

/** Componentes de la receta y cuánto se consume de cada uno al producir `cantidad` unidades. */
function consumosDeReceta(productoId: number, cantidad: number): Map<number, number> {
  const consumos = new Map<number, number>();
  for (const r of db.select().from(recetas).where(eq(recetas.productoId, productoId)).all()) {
    consumos.set(r.insumoId, (consumos.get(r.insumoId) ?? 0) + toNum(r.cantidad) * cantidad);
  }
  return consumos;
}

function aplicarProduccion(input: ProduccionInput) {
  getProducto(input.productoId);
  const consumos = consumosDeReceta(input.productoId, input.cantidad);

  for (const [componenteId, necesario] of Array.from(consumos)) {
    const comp = db.select().from(productos).where(eq(productos.id, componenteId)).get();
    if (!comp) throw notFound(`Componente de receta no encontrado (id: ${componenteId})`);
    const disponible = toNum(comp.stock);
    if (disponible < necesario - 0.001) {
      throw bad(`Insumo insuficiente: "${comp.nombre}". Necesario: ${fmt(necesario)} ${comp.unidad}, Disponible: ${fmt(disponible)} ${comp.unidad}`);
    }
  }
  for (const [componenteId, necesario] of Array.from(consumos)) ajustarStock(componenteId, -necesario);
  ajustarStock(input.productoId, input.cantidad);
}

function revertirProduccion(row: { productoId: number; cantidad: string }) {
  const cantidad = toNum(row.cantidad);
  const p = getProducto(row.productoId);
  if (toNum(p.stock) < cantidad - 0.001) {
    throw bad(`No se puede modificar ni eliminar esta producción: el stock actual de "${p.nombre}" (${fmt(toNum(p.stock))}) es menor a lo producido (${fmt(cantidad)}). Parte ya se vendió o se usó.`);
  }
  ajustarStock(row.productoId, -cantidad);
  for (const [componenteId, cant] of Array.from(consumosDeReceta(row.productoId, cantidad))) {
    if (db.select().from(productos).where(eq(productos.id, componenteId)).get()) ajustarStock(componenteId, cant);
  }
}

export function crearProduccion(input: ProduccionInput) {
  runInTransaction(() => {
    aplicarProduccion(input);
    db.insert(produccion).values({
      fecha: input.fecha,
      productoId: input.productoId,
      cantidad: String(input.cantidad),
      responsable: input.responsable,
      costoMP: String(input.costoMP),
    }).run();
  });
}

/** Edita un registro: revierte lo que había hecho y aplica los datos nuevos. Todo o nada. */
export function editarProduccion(id: number, input: ProduccionInput) {
  runInTransaction(() => {
    const actual = db.select().from(produccion).where(eq(produccion.id, id)).get();
    if (!actual) throw notFound("Registro de producción no encontrado");
    revertirProduccion(actual);
    aplicarProduccion(input);
    db.update(produccion).set({
      fecha: input.fecha,
      productoId: input.productoId,
      cantidad: String(input.cantidad),
      responsable: input.responsable,
      costoMP: String(input.costoMP),
      updatedAt: nowIso(),
    }).where(eq(produccion.id, id)).run();
  });
}

export function eliminarProduccion(id: number) {
  runInTransaction(() => {
    const actual = db.select().from(produccion).where(eq(produccion.id, id)).get();
    if (!actual) throw notFound("Registro de producción no encontrado");
    revertirProduccion(actual);
    db.delete(produccion).where(eq(produccion.id, id)).run();
  });
}

// ==================== LINEAS (ventas y cotizaciones) ====================
export type LineaInput = {
  productoId: number;
  cantidad: number;
  precioUnitario: number;
  descuento: number;
};

function validarProductosExisten(lineas: LineaInput[]) {
  for (const id of Array.from(new Set(lineas.map(l => l.productoId)))) getProducto(id);
}

const filaLinea = (l: LineaInput) => ({
  productoId: l.productoId,
  cantidad: String(l.cantidad),
  precioUnitario: String(l.precioUnitario),
  descuento: String(clampPct(l.descuento)),
  subtotal: String(subtotalLinea(l)),
});

// ==================== VENTAS ====================
export type VentaInput = {
  fecha: string;
  clienteId?: number | null;
  nuevoCliente?: NuevoCliente | null;
  dniCuit?: string;
  direccion?: string;
  localidad?: string;
  entrega?: "retiro_local" | "mercado_libre" | "envio";
  condicionPago: CondicionPago;
  descuento: number;
  comentarios?: string;
  items: LineaInput[];
};

export function crearVenta(input: VentaInput) {
  return runInTransaction(() => {
    const clienteId = resolverCliente(input.clienteId, input.nuevoCliente);
    const cliente = clienteId ? getCliente(clienteId) : undefined;
    if (input.condicionPago === "cuenta_corriente" && !cliente?.tieneCuentaCorriente) {
      throw bad("Para vender en cuenta corriente elegí un cliente que tenga cuenta corriente habilitada.");
    }

    // Si el mismo producto está en varias líneas, se valida y descuenta la suma.
    const porProducto = new Map<number, number>();
    for (const l of input.items) porProducto.set(l.productoId, (porProducto.get(l.productoId) ?? 0) + l.cantidad);
    for (const [productoId, cantidad] of Array.from(porProducto)) ajustarStock(productoId, -cantidad);

    const { subtotal, total } = calcularTotales(input.items, input.descuento);
    const numero = siguienteNumero("venta");
    const venta = db.insert(ventas).values({
      numero,
      fecha: input.fecha,
      clienteId,
      dniCuit: input.dniCuit?.trim() || cliente?.dni || null,
      direccion: input.direccion?.trim() || cliente?.direccion || null,
      localidad: input.localidad?.trim() || null,
      entrega: input.entrega ?? null,
      condicionPago: input.condicionPago,
      descuento: String(clampPct(input.descuento)),
      subtotal: String(subtotal),
      total: String(total),
      comentarios: input.comentarios?.trim() || null,
    }).returning().get();

    for (const l of input.items) db.insert(ventaItems).values({ ventaId: venta.id, ...filaLinea(l) }).run();

    if (input.condicionPago === "cuenta_corriente" && clienteId) {
      db.insert(movimientosCuenta).values({
        clienteId,
        fecha: input.fecha,
        tipo: "cargo",
        concepto: `Venta N° ${numero}`,
        monto: String(total),
        ventaId: venta.id,
      }).run();
    }
    return venta;
  });
}

export function eliminarVenta(id: number) {
  runInTransaction(() => {
    const venta = db.select().from(ventas).where(eq(ventas.id, id)).get();
    if (!venta) throw notFound("Venta no encontrada");
    for (const it of db.select().from(ventaItems).where(eq(ventaItems.ventaId, id)).all()) {
      // Si el producto ya no existe no hay stock que restaurar.
      if (db.select().from(productos).where(eq(productos.id, it.productoId)).get()) {
        ajustarStock(it.productoId, toNum(it.cantidad));
      }
    }
    db.delete(movimientosCuenta).where(eq(movimientosCuenta.ventaId, id)).run();
    db.delete(ventaItems).where(eq(ventaItems.ventaId, id)).run();
    db.delete(ventas).where(eq(ventas.id, id)).run();
  });
}

/** Asigna el próximo número de remito a la venta (una sola vez) y lo devuelve. */
export function generarRemito(ventaId: number): number {
  return runInTransaction(() => {
    const venta = db.select().from(ventas).where(eq(ventas.id, ventaId)).get();
    if (!venta) throw notFound("Venta no encontrada");
    if (venta.remitoNumero) return venta.remitoNumero;
    const numero = siguienteNumero("remito");
    db.update(ventas).set({ remitoNumero: numero, updatedAt: nowIso() }).where(eq(ventas.id, ventaId)).run();
    return numero;
  });
}

export function listarVentas() {
  const lista = db.select().from(ventas).orderBy(desc(ventas.fecha), desc(ventas.id)).all();
  const items = db.select().from(ventaItems).orderBy(ventaItems.id).all();
  const nombres = new Map(db.select().from(clientes).all().map(c => [c.id, c.nombre]));
  const itemsDe = new Map<number, typeof items>();
  for (const it of items) itemsDe.set(it.ventaId, [...(itemsDe.get(it.ventaId) ?? []), it]);
  return lista.map(v => ({
    ...v,
    clienteNombre: v.clienteId ? nombres.get(v.clienteId) ?? null : null,
    items: itemsDe.get(v.id) ?? [],
  }));
}

// ==================== COTIZACIONES ====================
export type CotizacionInput = {
  fecha: string;
  clienteId?: number | null;
  nuevoCliente?: NuevoCliente | null;
  condicionPago: CondicionPago;
  descuento: number;
  estado: (typeof ESTADOS_COTIZACION)[number];
  comentarios?: string;
  items: LineaInput[];
};

export function crearCotizacion(input: CotizacionInput) {
  return runInTransaction(() => {
    validarProductosExisten(input.items);
    const clienteId = resolverCliente(input.clienteId, input.nuevoCliente);
    const { subtotal, total } = calcularTotales(input.items, input.descuento);
    const cot = db.insert(cotizaciones).values({
      numero: siguienteNumero("cotizacion"),
      fecha: input.fecha,
      clienteId,
      condicionPago: input.condicionPago,
      descuento: String(clampPct(input.descuento)),
      subtotal: String(subtotal),
      total: String(total),
      estado: input.estado,
      comentarios: input.comentarios?.trim() || null,
    }).returning().get();
    for (const l of input.items) db.insert(cotizacionItems).values({ cotizacionId: cot.id, ...filaLinea(l) }).run();
    return cot;
  });
}

export function actualizarCotizacion(id: number, input: CotizacionInput) {
  runInTransaction(() => {
    if (!db.select().from(cotizaciones).where(eq(cotizaciones.id, id)).get()) throw notFound("Cotización no encontrada");
    validarProductosExisten(input.items);
    const clienteId = resolverCliente(input.clienteId, input.nuevoCliente);
    const { subtotal, total } = calcularTotales(input.items, input.descuento);
    db.update(cotizaciones).set({
      fecha: input.fecha,
      clienteId,
      condicionPago: input.condicionPago,
      descuento: String(clampPct(input.descuento)),
      subtotal: String(subtotal),
      total: String(total),
      estado: input.estado,
      comentarios: input.comentarios?.trim() || null,
      updatedAt: nowIso(),
    }).where(eq(cotizaciones.id, id)).run();
    db.delete(cotizacionItems).where(eq(cotizacionItems.cotizacionId, id)).run();
    for (const l of input.items) db.insert(cotizacionItems).values({ cotizacionId: id, ...filaLinea(l) }).run();
  });
}

export function eliminarCotizacion(id: number) {
  runInTransaction(() => {
    db.delete(cotizacionItems).where(eq(cotizacionItems.cotizacionId, id)).run();
    db.delete(cotizaciones).where(eq(cotizaciones.id, id)).run();
  });
}

export function listarCotizaciones() {
  const lista = db.select().from(cotizaciones).orderBy(desc(cotizaciones.fecha), desc(cotizaciones.id)).all();
  const items = db.select().from(cotizacionItems).orderBy(cotizacionItems.id).all();
  const nombres = new Map(db.select().from(clientes).all().map(c => [c.id, c.nombre]));
  const itemsDe = new Map<number, typeof items>();
  for (const it of items) itemsDe.set(it.cotizacionId, [...(itemsDe.get(it.cotizacionId) ?? []), it]);
  return lista.map(c => ({
    ...c,
    clienteNombre: c.clienteId ? nombres.get(c.clienteId) ?? null : null,
    items: itemsDe.get(c.id) ?? [],
  }));
}
