import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
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

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ==================== INSUMOS ====================
export async function createInsumo(data: InsertInsumo) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(insumos).values(data);
  return result;
}

export async function getInsumos() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(insumos).orderBy(insumos.id);
}

export async function getInsumoById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(insumos).where(eq(insumos.id, id)).limit(1);
  return result[0];
}

export async function updateInsumo(id: number, data: Partial<InsertInsumo>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(insumos).set(data).where(eq(insumos.id, id));
}

export async function deleteInsumo(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(insumos).where(eq(insumos.id, id));
}

export async function decrementInsumoStock(id: number, cantidad: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const insumo = await getInsumoById(id);
  if (!insumo) throw new Error("Insumo not found");
  const newCantidad = parseFloat(insumo.cantidad?.toString() || "0") - cantidad;
  if (newCantidad < -0.001) throw new Error(`Stock insuficiente para: ${insumo.descripcion}`);
  return await db.update(insumos).set({ cantidad: Math.max(0, newCantidad).toString() }).where(eq(insumos.id, id));
}

// ==================== PRODUCTOS ====================
export async function createProducto(data: InsertProducto) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(productos).values(data);
}

export async function getProductos() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(productos).orderBy(productos.id);
}

export async function getProductoById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(productos).where(eq(productos.id, id)).limit(1);
  return result[0];
}

export async function updateProducto(id: number, data: Partial<InsertProducto>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(productos).set(data).where(eq(productos.id, id));
}

export async function deleteProducto(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(productos).where(eq(productos.id, id));
}

export async function updateProductoStock(id: number, cantidad: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const producto = await getProductoById(id);
  if (!producto) throw new Error("Producto not found");
  const newStock = parseFloat(producto.stock?.toString() || "0") + cantidad;
  if (newStock < -0.001) throw new Error(`Stock insuficiente para: ${producto.nombre}`);
  return await db.update(productos).set({ stock: Math.max(0, newStock).toString() }).where(eq(productos.id, id));
}

// ==================== RECETAS ====================
export async function createReceta(data: InsertReceta) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(recetas).values(data);
}

export async function getRecetas() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(recetas).orderBy(recetas.id);
}

export async function getRecetasByProducto(productoId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(recetas).where(eq(recetas.productoId, productoId));
}

export async function updateReceta(id: number, data: Partial<InsertReceta>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.update(recetas).set(data).where(eq(recetas.id, id));
}

export async function deleteReceta(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(recetas).where(eq(recetas.id, id));
}

// ==================== PRODUCCION ====================
export async function createProduccion(data: InsertProduccion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(produccion).values(data);
}

export async function getProduccion() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(produccion).orderBy(produccion.fecha);
}

export async function getProduccionById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(produccion).where(eq(produccion.id, id)).limit(1);
  return result[0];
}

export async function deleteProduccion(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(produccion).where(eq(produccion.id, id));
}

// ==================== VENTAS ====================
export async function createVenta(data: InsertVenta) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.insert(ventas).values(data);
}

export async function getVentas() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(ventas).orderBy(ventas.fecha);
}

export async function getVentaById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(ventas).where(eq(ventas.id, id)).limit(1);
  return result[0];
}

export async function deleteVenta(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.delete(ventas).where(eq(ventas.id, id));
}

// ==================== DASHBOARD ====================
export async function getDashboardStats() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

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
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { lte } = await import("drizzle-orm");
  return await db.select().from(productos).where(lte(productos.stock, limite.toString()));
}

export async function getInsumosBajo(limite: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { lte } = await import("drizzle-orm");
  return await db.select().from(insumos).where(lte(insumos.cantidad, limite.toString()));
}

// Import types
import { InsertInsumo, InsertProducto, InsertReceta, InsertProduccion, InsertVenta } from "../drizzle/schema";
import { insumos, productos, recetas, produccion, ventas } from "../drizzle/schema";
