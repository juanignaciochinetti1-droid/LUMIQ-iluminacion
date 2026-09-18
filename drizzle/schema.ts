import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

const now = () => new Date().toISOString();

// ==================== USERS ====================
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  openId: text("openId").notNull().unique(),
  name: text("name"),
  email: text("email"),
  loginMethod: text("loginMethod"),
  role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
  createdAt: text("createdAt").notNull().$defaultFn(now),
  updatedAt: text("updatedAt").notNull().$defaultFn(now),
  lastSignedIn: text("lastSignedIn").notNull().$defaultFn(now),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== PRODUCTOS ====================
// Catálogo unificado: productos terminados, materia prima e insumos viven en la misma tabla.
// Cualquier producto puede ser componente de la receta de otro.
export const productos = sqliteTable("productos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Código interno */
  codigo: text("codigo").unique(),
  codigoProveedor: text("codigoProveedor"),
  nombre: text("nombre").notNull(),
  unidad: text("unidad").notNull().default("u"),
  stock: text("stock").default("0"),
  costo: text("costo"),
  /** Precio de lista */
  precioVenta: text("precioVenta").default("0"),
  /** Descuento (%) que se aplica sobre el precio de lista para obtener el precio de contado */
  descuentoContado: text("descuentoContado").default("0"),
  createdAt: text("createdAt").notNull().$defaultFn(now),
  updatedAt: text("updatedAt").notNull().$defaultFn(now),
});

export type Producto = typeof productos.$inferSelect;
export type InsertProducto = typeof productos.$inferInsert;

// ==================== RECETAS ====================
export const recetas = sqliteTable("recetas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productoId: integer("productoId").notNull(),
  /** Id del producto usado como componente (antes apuntaba a la tabla insumos). */
  insumoId: integer("insumoId").notNull(),
  cantidad: text("cantidad").notNull(),
  unidad: text("unidad").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(now),
  updatedAt: text("updatedAt").notNull().$defaultFn(now),
});

export type Receta = typeof recetas.$inferSelect;
export type InsertReceta = typeof recetas.$inferInsert;

// ==================== PRODUCCION ====================
export const produccion = sqliteTable("produccion", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fecha: text("fecha").notNull(),
  productoId: integer("productoId").notNull(),
  cantidad: text("cantidad").notNull(),
  responsable: text("responsable").notNull(),
  costoMP: text("costoMP").default("0"),
  createdAt: text("createdAt").notNull().$defaultFn(now),
  updatedAt: text("updatedAt").notNull().$defaultFn(now),
});

export type Produccion = typeof produccion.$inferSelect;
export type InsertProduccion = typeof produccion.$inferInsert;

// ==================== CLIENTES ====================
export const clientes = sqliteTable("clientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(), // nombre y apellido
  dni: text("dni"),
  telefono: text("telefono"),
  direccion: text("direccion"),
  /** 1 si el cliente opera con cuenta corriente */
  tieneCuentaCorriente: integer("tieneCuentaCorriente").notNull().default(0),
  createdAt: text("createdAt").notNull().$defaultFn(now),
  updatedAt: text("updatedAt").notNull().$defaultFn(now),
});

export type Cliente = typeof clientes.$inferSelect;
export type InsertCliente = typeof clientes.$inferInsert;

// ==================== CUENTA CORRIENTE ====================
// cargo = aumenta la deuda del cliente (venta a cuenta corriente); pago = la disminuye.
export const movimientosCuenta = sqliteTable("movimientos_cuenta", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clienteId: integer("clienteId").notNull(),
  fecha: text("fecha").notNull(),
  tipo: text("tipo", { enum: ["cargo", "pago"] }).notNull(),
  concepto: text("concepto"),
  monto: text("monto").notNull(),
  ventaId: integer("ventaId"),
  createdAt: text("createdAt").notNull().$defaultFn(now),
});

export type MovimientoCuenta = typeof movimientosCuenta.$inferSelect;
export type InsertMovimientoCuenta = typeof movimientosCuenta.$inferInsert;

// ==================== VENTAS ====================
export const CONDICIONES_PAGO = ["contado", "lista", "cuenta_corriente"] as const;
export type CondicionPago = (typeof CONDICIONES_PAGO)[number];

export const ventas = sqliteTable("ventas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  /** Número correlativo de venta (independiente del de remito) */
  numero: integer("numero").notNull(),
  fecha: text("fecha").notNull(),
  /** Número correlativo de remito; null hasta que se genera el remito */
  remitoNumero: integer("remitoNumero"),
  /** Remito cargado a mano en el sistema anterior (solo lectura) */
  remito: text("remito"),
  clienteId: integer("clienteId"),
  dniCuit: text("dniCuit"),
  direccion: text("direccion"),
  localidad: text("localidad"),
  entrega: text("entrega", { enum: ["retiro_local", "mercado_libre", "envio"] }),
  condicionPago: text("condicionPago", { enum: CONDICIONES_PAGO }).notNull().default("lista"),
  /** Descuento general (%) aplicado sobre el subtotal de todas las líneas */
  descuento: text("descuento").notNull().default("0"),
  subtotal: text("subtotal").notNull().default("0"),
  total: text("total").notNull(),
  comentarios: text("comentarios"),
  createdAt: text("createdAt").notNull().$defaultFn(now),
  updatedAt: text("updatedAt").notNull().$defaultFn(now),
});

export type Venta = typeof ventas.$inferSelect;
export type InsertVenta = typeof ventas.$inferInsert;

export const ventaItems = sqliteTable("venta_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ventaId: integer("ventaId").notNull(),
  productoId: integer("productoId").notNull(),
  cantidad: text("cantidad").notNull(),
  precioUnitario: text("precioUnitario").notNull(),
  /** Descuento (%) de la línea */
  descuento: text("descuento").notNull().default("0"),
  subtotal: text("subtotal").notNull(),
});

export type VentaItem = typeof ventaItems.$inferSelect;
export type InsertVentaItem = typeof ventaItems.$inferInsert;

// ==================== COTIZACIONES ====================
export const ESTADOS_COTIZACION = ["pendiente", "aceptada", "rechazada"] as const;

export const cotizaciones = sqliteTable("cotizaciones", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  numero: integer("numero").notNull(),
  fecha: text("fecha").notNull(),
  clienteId: integer("clienteId"),
  condicionPago: text("condicionPago", { enum: CONDICIONES_PAGO }).notNull().default("lista"),
  descuento: text("descuento").notNull().default("0"),
  subtotal: text("subtotal").notNull().default("0"),
  total: text("total").notNull(),
  estado: text("estado", { enum: ESTADOS_COTIZACION }).notNull().default("pendiente"),
  comentarios: text("comentarios"),
  createdAt: text("createdAt").notNull().$defaultFn(now),
  updatedAt: text("updatedAt").notNull().$defaultFn(now),
});

export type Cotizacion = typeof cotizaciones.$inferSelect;
export type InsertCotizacion = typeof cotizaciones.$inferInsert;

export const cotizacionItems = sqliteTable("cotizacion_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cotizacionId: integer("cotizacionId").notNull(),
  productoId: integer("productoId").notNull(),
  cantidad: text("cantidad").notNull(),
  precioUnitario: text("precioUnitario").notNull(),
  descuento: text("descuento").notNull().default("0"),
  subtotal: text("subtotal").notNull(),
});

export type CotizacionItem = typeof cotizacionItems.$inferSelect;
export type InsertCotizacionItem = typeof cotizacionItems.$inferInsert;

// ==================== CONTADORES ====================
// Un contador por tipo de documento ('venta', 'remito', 'cotizacion'): así cada
// numeración es correlativa, independiente de las demás y no reutiliza números borrados.
export const contadores = sqliteTable("contadores", {
  nombre: text("nombre").primaryKey(),
  valor: integer("valor").notNull().default(0),
});

// ==================== RELACIONES ====================
export const recetasRelations = relations(recetas, ({ one }) => ({
  producto: one(productos, { fields: [recetas.productoId], references: [productos.id] }),
  componente: one(productos, { fields: [recetas.insumoId], references: [productos.id] }),
}));

export const produccionRelations = relations(produccion, ({ one }) => ({
  producto: one(productos, { fields: [produccion.productoId], references: [productos.id] }),
}));

export const ventasRelations = relations(ventas, ({ one, many }) => ({
  cliente: one(clientes, { fields: [ventas.clienteId], references: [clientes.id] }),
  items: many(ventaItems),
}));

export const ventaItemsRelations = relations(ventaItems, ({ one }) => ({
  venta: one(ventas, { fields: [ventaItems.ventaId], references: [ventas.id] }),
  producto: one(productos, { fields: [ventaItems.productoId], references: [productos.id] }),
}));
