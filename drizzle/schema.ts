import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, date } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==================== INSUMOS ====================
export const insumos = mysqlTable("insumos", {
  id: int("id").autoincrement().primaryKey(),
  codigo: varchar("codigo", { length: 50 }).notNull().unique(),
  descripcion: text("descripcion").notNull(),
  cantidad: decimal("cantidad", { precision: 10, scale: 3 }).default("0"),
  unidad: varchar("unidad", { length: 50 }).notNull(),
  precioUnitario: decimal("precioUnitario", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Insumo = typeof insumos.$inferSelect;
export type InsertInsumo = typeof insumos.$inferInsert;

// ==================== PRODUCTOS ====================
export const productos = mysqlTable("productos", {
  id: int("id").autoincrement().primaryKey(),
  nombre: varchar("nombre", { length: 255 }).notNull(),
  stock: decimal("stock", { precision: 10, scale: 3 }).default("0"),
  precioVenta: decimal("precioVenta", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Producto = typeof productos.$inferSelect;
export type InsertProducto = typeof productos.$inferInsert;

// ==================== RECETAS ====================
export const recetas = mysqlTable("recetas", {
  id: int("id").autoincrement().primaryKey(),
  productoId: int("productoId").notNull(),
  insumoId: int("insumoId").notNull(),
  cantidad: decimal("cantidad", { precision: 10, scale: 3 }).notNull(),
  unidad: varchar("unidad", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Receta = typeof recetas.$inferSelect;
export type InsertReceta = typeof recetas.$inferInsert;

// ==================== PRODUCCION ====================
export const produccion = mysqlTable("produccion", {
  id: int("id").autoincrement().primaryKey(),
  fecha: date("fecha").notNull(),
  productoId: int("productoId").notNull(),
  cantidad: decimal("cantidad", { precision: 10, scale: 3 }).notNull(),
  responsable: varchar("responsable", { length: 255 }).notNull(),
  costoMP: decimal("costoMP", { precision: 12, scale: 2 }).default("0"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Produccion = typeof produccion.$inferSelect;
export type InsertProduccion = typeof produccion.$inferInsert;

// ==================== VENTAS ====================
export const ventas = mysqlTable("ventas", {
  id: int("id").autoincrement().primaryKey(),
  fecha: date("fecha").notNull(),
  remito: varchar("remito", { length: 100 }),
  dniCuit: varchar("dniCuit", { length: 50 }),
  direccion: text("direccion"),
  localidad: varchar("localidad", { length: 255 }),
  productoId: int("productoId").notNull(),
  cantidad: decimal("cantidad", { precision: 10, scale: 3 }).notNull(),
  precioUnitario: decimal("precioUnitario", { precision: 12, scale: 2 }).notNull(),
  total: decimal("total", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
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