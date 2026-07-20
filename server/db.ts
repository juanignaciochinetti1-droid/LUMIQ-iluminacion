import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "fs";
import path from "path";
import {
  InsertUser, InsertInsumo, InsertProducto, InsertReceta, InsertProduccion, InsertVenta,
  users, insumos, productos, recetas, produccion, ventas,
} from "../drizzle/schema";
import { ENV } from './_core/env';

function resolveDbPath(): string {
  const envPath = process.env.SQLITE_DB_PATH;
  if (envPath) return envPath;
  const dataDir = path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "gestion.db");
}

const sqlite = new Database(resolveDbPath());
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);

export function getDb() {
  return db;
}

export function initializeTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      openId TEXT NOT NULL UNIQUE,
      name TEXT,
      email TEXT,
      loginMethod TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      lastSignedIn TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS insumos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT NOT NULL UNIQUE,
      descripcion TEXT NOT NULL,
      cantidad TEXT DEFAULT '0',
      unidad TEXT NOT NULL,
      precioUnitario TEXT DEFAULT '0',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      stock TEXT DEFAULT '0',
      precioVenta TEXT DEFAULT '0',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      codigo TEXT UNIQUE,
      costo TEXT
    );

    CREATE TABLE IF NOT EXISTS recetas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      productoId INTEGER NOT NULL,
      insumoId INTEGER NOT NULL,
      cantidad TEXT NOT NULL,
      unidad TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS produccion (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      productoId INTEGER NOT NULL,
      cantidad TEXT NOT NULL,
      responsable TEXT NOT NULL,
      costoMP TEXT DEFAULT '0',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ventas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha TEXT NOT NULL,
      remito TEXT,
      dniCuit TEXT,
      direccion TEXT,
      localidad TEXT,
      entrega TEXT,
      productoId INTEGER NOT NULL,
      cantidad TEXT NOT NULL,
      precioUnitario TEXT NOT NULL,
      total TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  const ventasColumns = sqlite.prepare("PRAGMA table_info(ventas)").all() as { name: string }[];
  if (!ventasColumns.some(c => c.name === "entrega")) {
    sqlite.exec("ALTER TABLE ventas ADD COLUMN entrega TEXT");
  }
}

initializeTables();

// ==================== USERS ====================
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = 'admin';
    updateSet.role = 'admin';
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date().toISOString();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date().toISOString();

  await db.insert(users).values(values).onConflictDoUpdate({
    target: users.openId,
    set: updateSet,
  });
}

export async function getUserByOpenId(openId: string) {
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== INSUMOS ====================
export async function createInsumo(data: InsertInsumo) {
  return db.insert(insumos).values(data);
}

export async function getInsumos() {
  return db.select().from(insumos).orderBy(insumos.id);
}

export async function getInsumoById(id: number) {
  const result = await db.select().from(insumos).where(eq(insumos.id, id)).limit(1);
  return result[0];
}

export async function updateInsumo(id: number, data: Partial<InsertInsumo>) {
  return db.update(insumos).set(data).where(eq(insumos.id, id));
}

export async function deleteInsumo(id: number) {
  return db.delete(insumos).where(eq(insumos.id, id));
}

export async function decrementInsumoStock(id: number, cantidad: number) {
  const insumo = await getInsumoById(id);
  if (!insumo) throw new Error("Insumo not found");
  const newCantidad = parseFloat(insumo.cantidad?.toString() || "0") - cantidad;
  if (newCantidad < -0.001) throw new Error(`Stock insuficiente para: ${insumo.descripcion}`);
  return db.update(insumos).set({ cantidad: Math.max(0, newCantidad).toString() }).where(eq(insumos.id, id));
}

export async function incrementInsumoStock(id: number, cantidad: number) {
  const insumo = await getInsumoById(id);
  if (!insumo) throw new Error("Insumo not found");
  const newCantidad = parseFloat(insumo.cantidad?.toString() || "0") + cantidad;
  return db.update(insumos).set({ cantidad: newCantidad.toString() }).where(eq(insumos.id, id));
}

// ==================== PRODUCTOS ====================
export async function createProducto(data: InsertProducto) {
  return db.insert(productos).values(data);
}

export async function getProductos() {
  return db.select().from(productos).orderBy(productos.id);
}

export async function getProductoById(id: number) {
  const result = await db.select().from(productos).where(eq(productos.id, id)).limit(1);
  return result[0];
}

export async function updateProducto(id: number, data: Partial<InsertProducto>) {
  return db.update(productos).set(data).where(eq(productos.id, id));
}

export async function deleteProducto(id: number) {
  return db.delete(productos).where(eq(productos.id, id));
}

export async function updateProductoStock(id: number, cantidad: number) {
  const producto = await getProductoById(id);
  if (!producto) throw new Error("Producto not found");
  const newStock = parseFloat(producto.stock?.toString() || "0") + cantidad;
  if (newStock < -0.001) throw new Error(`Stock insuficiente para: ${producto.nombre}`);
  return db.update(productos).set({ stock: Math.max(0, newStock).toString() }).where(eq(productos.id, id));
}

// ==================== RECETAS ====================
export async function createReceta(data: InsertReceta) {
  return db.insert(recetas).values(data);
}

export async function getRecetas() {
  return db.select().from(recetas).orderBy(recetas.id);
}

export async function getRecetasByProducto(productoId: number) {
  return db.select().from(recetas).where(eq(recetas.productoId, productoId));
}

export async function updateReceta(id: number, data: Partial<InsertReceta>) {
  return db.update(recetas).set(data).where(eq(recetas.id, id));
}

export async function deleteReceta(id: number) {
  return db.delete(recetas).where(eq(recetas.id, id));
}

// ==================== PRODUCCION ====================
export async function createProduccion(data: InsertProduccion) {
  return db.insert(produccion).values(data);
}

export async function getProduccion() {
  return db.select().from(produccion).orderBy(produccion.fecha);
}

export async function getProduccionById(id: number) {
  const result = await db.select().from(produccion).where(eq(produccion.id, id)).limit(1);
  return result[0];
}

export async function deleteProduccion(id: number) {
  return db.delete(produccion).where(eq(produccion.id, id));
}

// ==================== VENTAS ====================
export async function createVenta(data: InsertVenta) {
  return db.insert(ventas).values(data);
}

export async function getVentas() {
  return db.select().from(ventas).orderBy(ventas.fecha);
}

export async function getVentaById(id: number) {
  const result = await db.select().from(ventas).where(eq(ventas.id, id)).limit(1);
  return result[0];
}

export async function deleteVenta(id: number) {
  return db.delete(ventas).where(eq(ventas.id, id));
}

// ==================== DASHBOARD ====================
export async function getDashboardStats() {
  const ventasData = await db.select().from(ventas);
  const productosData = await db.select().from(productos);

  const totalVentas = ventasData.reduce((sum, v) => sum + parseFloat(v.total?.toString() || "0"), 0);
  const totalUnidades = ventasData.reduce((sum, v) => sum + parseFloat(v.cantidad?.toString() || "0"), 0);

  const porProducto: Record<string, { cantidad: number; total: number }> = {};
  ventasData.forEach(v => {
    const key = v.productoId?.toString() || "unknown";
    if (!porProducto[key]) porProducto[key] = { cantidad: 0, total: 0 };
    porProducto[key].cantidad += parseFloat(v.cantidad?.toString() || "0");
    porProducto[key].total += parseFloat(v.total?.toString() || "0");
  });

  const getNombre = (id: number) => productosData.find(p => p.id === id)?.nombre || `Producto ${id}`;
  const entries = Object.entries(porProducto).sort((a, b) => b[1].cantidad - a[1].cantidad);
  const maVendido = entries[0]
    ? { productoId: parseInt(entries[0][0]), nombre: getNombre(parseInt(entries[0][0])), ...entries[0][1] }
    : null;
  const menosVendido = entries.length > 1
    ? { productoId: parseInt(entries[entries.length - 1][0]), nombre: getNombre(parseInt(entries[entries.length - 1][0])), ...entries[entries.length - 1][1] }
    : null;

  return { totalVentas, totalUnidades, maVendido, menosVendido };
}

export async function getStockBajo(limite: number = 10) {
  const { lte } = await import("drizzle-orm");
  return db.select().from(productos).where(lte(productos.stock, String(limite)));
}

export async function getInsumosBajo(limite: number = 10) {
  const { lte } = await import("drizzle-orm");
  return db.select().from(insumos).where(lte(insumos.cantidad, String(limite)));
}
