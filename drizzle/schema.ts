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

// ==================== INSUMOS ====================
export const insumos = sqliteTable("insumos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  codigo: text("codigo").notNull().unique(),
  descripcion: text("descripcion").notNull(),
  cantidad: text("cantidad").default("0"),
  unidad: text("unidad").notNull(),
  precioUnitario: text("precioUnitario").default("0"),
  createdAt: text("createdAt").notNull().$defaultFn(now),
  updatedAt: text("updatedAt").notNull().$defaultFn(now),
});

export type Insumo = typeof insumos.$inferSelect;
export type InsertInsumo = typeof insumos.$inferInsert;

// ==================== PRODUCTOS ====================
export const productos = sqliteTable("productos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nombre: text("nombre").notNull(),
  stock: text("stock").default("0"),
  precioVenta: text("precioVenta").default("0"),
  createdAt: text("createdAt").notNull().$defaultFn(now),
  updatedAt: text("updatedAt").notNull().$defaultFn(now),
  codigo: text("codigo").unique(),
  costo: text("costo"),
});

export type Producto = typeof productos.$inferSelect;
export type InsertProducto = typeof productos.$inferInsert;

// ==================== RECETAS ====================
export const recetas = sqliteTable("recetas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productoId: integer("productoId").notNull(),
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

// ==================== VENTAS ====================
export const ventas = sqliteTable("ventas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  fecha: text("fecha").notNull(),
  remito: text("remito"),
  dniCuit: text("dniCuit"),
  direccion: text("direccion"),
  localidad: text("localidad"),
  productoId: integer("productoId").notNull(),
  cantidad: text("cantidad").notNull(),
  precioUnitario: text("precioUnitario").notNull(),
  total: text("total").notNull(),
  createdAt: text("createdAt").notNull().$defaultFn(now),
  updatedAt: text("updatedAt").notNull().$defaultFn(now),
});

export type Venta = typeof ventas.$inferSelect;
export type InsertVenta = typeof ventas.$inferInsert;

// ==================== RELACIONES ====================
export const recetasRelations = relations(recetas, ({ one }) => ({
  producto: one(productos, { fields: [recetas.productoId], references: [productos.id] }),
  insumo: one(insumos, { fields: [recetas.insumoId], references: [insumos.id] }),
}));

export const produccionRelations = relations(produccion, ({ one }) => ({
  producto: one(productos, { fields: [produccion.productoId], references: [productos.id] }),
}));

export const ventasRelations = relations(ventas, ({ one }) => ({
  producto: one(productos, { fields: [ventas.productoId], references: [productos.id] }),
}));
