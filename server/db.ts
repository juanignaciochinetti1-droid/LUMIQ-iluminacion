import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import path from "path";
import {
  InsertUser, InsertProducto, InsertReceta, InsertCliente,
  users, productos, recetas, produccion, clientes, ventas, ventaItems,
} from "../drizzle/schema";
import { ENV } from './_core/env';

function resolveDbPath(): string {
  const envPath = process.env.SQLITE_DB_PATH;
  if (envPath) return envPath;
  const dataDir = path.join(process.cwd(), "data");
  mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "gestion.db");
}

export const sqlite = new Database(resolveDbPath());
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite);

export function getDb() {
  return db;
}

/** Ejecuta `fn` en una transacción: si lanza un error, se revierte todo. `fn` debe ser síncrona. */
export function runInTransaction<T>(fn: () => T): T {
  return sqlite.transaction(fn)();
}

// ==================== ESQUEMA Y MIGRACIONES ====================
const tableExists = (name: string) =>
  !!sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);

const columnNames = (table: string) =>
  (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map(c => c.name);

function addColumnIfMissing(table: string, column: string, ddl: string) {
  if (!columnNames(table).includes(column)) sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

const VENTAS_DDL = `
  CREATE TABLE ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero INTEGER NOT NULL,
    fecha TEXT NOT NULL,
    remitoNumero INTEGER,
    remito TEXT,
    clienteId INTEGER,
    dniCuit TEXT,
    direccion TEXT,
    localidad TEXT,
    entrega TEXT,
    condicionPago TEXT NOT NULL DEFAULT 'lista',
    descuento TEXT NOT NULL DEFAULT '0',
    subtotal TEXT NOT NULL DEFAULT '0',
    total TEXT NOT NULL,
    comentarios TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
`;

/** Unifica la tabla `insumos` dentro de `productos` (una sola vez). La tabla vieja queda como respaldo. */
function migrarInsumosAProductos() {
  if (!tableExists("insumos")) return;
  const now = new Date().toISOString();

  sqlite.transaction(() => {
    const viejos = sqlite.prepare("SELECT * FROM insumos ORDER BY id").all() as any[];
    const codigoLibre = sqlite.prepare("SELECT 1 FROM productos WHERE codigo = ?");
    const insertar = sqlite.prepare(`
      INSERT INTO productos (codigo, nombre, unidad, stock, costo, precioVenta, descuentoContado, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, '0', '0', ?, ?)
    `);

    const nuevoId = new Map<number, number>();
    for (const ins of viejos) {
      let codigo: string = ins.codigo;
      while (codigoLibre.get(codigo)) codigo = `${codigo}-INS`;
      const r = insertar.run(
        codigo, ins.descripcion, ins.unidad || "u", ins.cantidad ?? "0", ins.precioUnitario ?? "0",
        ins.createdAt || now, ins.updatedAt || now,
      );
      nuevoId.set(ins.id, Number(r.lastInsertRowid));
    }

    const cambiarComponente = sqlite.prepare("UPDATE recetas SET insumoId = ? WHERE id = ?");
    for (const rec of sqlite.prepare("SELECT id, insumoId FROM recetas").all() as any[]) {
      const id = nuevoId.get(rec.insumoId);
      if (id) cambiarComponente.run(id, rec.id);
    }

    sqlite.exec("DROP TABLE IF EXISTS insumos_migrado");
    sqlite.exec("ALTER TABLE insumos RENAME TO insumos_migrado");
  })();
}

/** Convierte las ventas de un renglón (formato viejo) a cabecera + líneas (una sola vez). */
function migrarVentasACabeceraYLineas() {
  if (!tableExists("ventas") || columnNames("ventas").includes("numero")) return;
  const now = new Date().toISOString();

  sqlite.transaction(() => {
    if (!columnNames("ventas").includes("entrega")) sqlite.exec("ALTER TABLE ventas ADD COLUMN entrega TEXT");
    const viejas = sqlite.prepare("SELECT * FROM ventas ORDER BY id").all() as any[];

    sqlite.exec("DROP TABLE IF EXISTS ventas_migrado");
    sqlite.exec("ALTER TABLE ventas RENAME TO ventas_migrado");
    sqlite.exec(VENTAS_DDL);

    const insertarVenta = sqlite.prepare(`
      INSERT INTO ventas (id, numero, fecha, remito, dniCuit, direccion, localidad, entrega, condicionPago,
                          descuento, subtotal, total, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'lista', '0', ?, ?, ?, ?)
    `);
    const insertarItem = sqlite.prepare(`
      INSERT INTO venta_items (ventaId, productoId, cantidad, precioUnitario, descuento, subtotal)
      VALUES (?, ?, ?, ?, '0', ?)
    `);

    viejas.forEach((v, i) => {
      insertarVenta.run(
        v.id, i + 1, v.fecha, v.remito ?? null, v.dniCuit ?? null, v.direccion ?? null, v.localidad ?? null,
        v.entrega ?? null, v.total, v.total, v.createdAt || now, v.updatedAt || now,
      );
      insertarItem.run(v.id, v.productoId, v.cantidad, v.precioUnitario, v.total);
    });
  })();
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

    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      codigo TEXT UNIQUE,
      codigoProveedor TEXT,
      nombre TEXT NOT NULL,
      unidad TEXT NOT NULL DEFAULT 'u',
      stock TEXT DEFAULT '0',
      costo TEXT,
      precioVenta TEXT DEFAULT '0',
      descuentoContado TEXT DEFAULT '0',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
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

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      dni TEXT,
      telefono TEXT,
      direccion TEXT,
      tieneCuentaCorriente INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movimientos_cuenta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      clienteId INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      tipo TEXT NOT NULL,
      concepto TEXT,
      monto TEXT NOT NULL,
      ventaId INTEGER,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS venta_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ventaId INTEGER NOT NULL,
      productoId INTEGER NOT NULL,
      cantidad TEXT NOT NULL,
      precioUnitario TEXT NOT NULL,
      descuento TEXT NOT NULL DEFAULT '0',
      subtotal TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cotizaciones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero INTEGER NOT NULL,
      fecha TEXT NOT NULL,
      clienteId INTEGER,
      condicionPago TEXT NOT NULL DEFAULT 'lista',
      descuento TEXT NOT NULL DEFAULT '0',
      subtotal TEXT NOT NULL DEFAULT '0',
      total TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'pendiente',
      comentarios TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cotizacion_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cotizacionId INTEGER NOT NULL,
      productoId INTEGER NOT NULL,
      cantidad TEXT NOT NULL,
      precioUnitario TEXT NOT NULL,
      descuento TEXT NOT NULL DEFAULT '0',
      subtotal TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS contadores (
      nombre TEXT PRIMARY KEY,
      valor INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Bases creadas con versiones anteriores: completar columnas nuevas de productos.
  const cols = columnNames("productos");
  if (!cols.includes("codigo")) {
    // SQLite no permite agregar una columna UNIQUE con ALTER TABLE: se agrega y se indexa aparte.
    sqlite.exec("ALTER TABLE productos ADD COLUMN codigo TEXT");
    sqlite.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo)");
  }
  addColumnIfMissing("productos", "costo", "TEXT");
  addColumnIfMissing("productos", "codigoProveedor", "TEXT");
  addColumnIfMissing("productos", "unidad", "TEXT NOT NULL DEFAULT 'u'");
  addColumnIfMissing("productos", "descuentoContado", "TEXT DEFAULT '0'");

  migrarInsumosAProductos();
  migrarVentasACabeceraYLineas();
  if (!tableExists("ventas")) sqlite.exec(VENTAS_DDL);

  // Los contadores nunca quedan por debajo del mayor número ya emitido.
  sqlite.exec(`
    INSERT OR IGNORE INTO contadores (nombre, valor) VALUES ('venta', 0), ('remito', 0), ('cotizacion', 0);
    UPDATE contadores SET valor = MAX(valor, (SELECT COALESCE(MAX(numero), 0) FROM ventas)) WHERE nombre = 'venta';
    UPDATE contadores SET valor = MAX(valor, (SELECT COALESCE(MAX(remitoNumero), 0) FROM ventas)) WHERE nombre = 'remito';
    UPDATE contadores SET valor = MAX(valor, (SELECT COALESCE(MAX(numero), 0) FROM cotizaciones)) WHERE nombre = 'cotizacion';
  `);
}

initializeTables();

/** Siguiente número de una numeración correlativa ('venta', 'remito' o 'cotizacion'). Usar dentro de una transacción. */
export function siguienteNumero(nombre: "venta" | "remito" | "cotizacion"): number {
  sqlite.prepare("UPDATE contadores SET valor = valor + 1 WHERE nombre = ?").run(nombre);
  return (sqlite.prepare("SELECT valor FROM contadores WHERE nombre = ?").get(nombre) as { valor: number }).valor;
}

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

// ==================== PRODUCTOS ====================
export async function createProducto(data: InsertProducto) {
  const r = db.insert(productos).values(data).run();
  return { id: Number(r.lastInsertRowid) };
}

export async function getProductos() {
  return db.select().from(productos).orderBy(productos.id);
}

export async function getProductoById(id: number) {
  const result = await db.select().from(productos).where(eq(productos.id, id)).limit(1);
  return result[0];
}

export async function updateProducto(id: number, data: Partial<InsertProducto>) {
  return db.update(productos).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(productos.id, id));
}

export async function deleteProducto(id: number) {
  return db.delete(productos).where(eq(productos.id, id));
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

export async function getRecetaById(id: number) {
  const result = await db.select().from(recetas).where(eq(recetas.id, id)).limit(1);
  return result[0];
}

export async function updateReceta(id: number, data: Partial<InsertReceta>) {
  return db.update(recetas).set({ ...data, updatedAt: new Date().toISOString() }).where(eq(recetas.id, id));
}

export async function deleteReceta(id: number) {
  return db.delete(recetas).where(eq(recetas.id, id));
}

/** Recetas de otros productos que usan a este producto como componente. */
export function getRecetasQueUsan(productoId: number) {
  return db.select().from(recetas).where(eq(recetas.insumoId, productoId)).all();
}

// ==================== PRODUCCION ====================
export async function getProduccion() {
  return db.select().from(produccion).orderBy(produccion.fecha);
}

// ==================== CLIENTES ====================
export function createCliente(data: InsertCliente) {
  const r = db.insert(clientes).values(data).run();
  return Number(r.lastInsertRowid);
}

/** Clientes con su saldo de cuenta corriente (cargos - pagos). */
export async function getClientes() {
  const saldos = sqlite.prepare(`
    SELECT clienteId,
           SUM(CASE WHEN tipo = 'cargo' THEN CAST(monto AS REAL) ELSE -CAST(monto AS REAL) END) AS saldo
    FROM movimientos_cuenta GROUP BY clienteId
  `).all() as { clienteId: number; saldo: number }[];
  const saldoDe = new Map(saldos.map(s => [s.clienteId, Math.round(s.saldo * 100) / 100]));
  const lista = await db.select().from(clientes).orderBy(clientes.nombre);
  return lista.map(c => ({ ...c, saldo: saldoDe.get(c.id) ?? 0 }));
}

// ==================== DASHBOARD ====================
export async function getDashboardStats() {
  const ventasData = await db.select().from(ventas);
  const items = await db.select().from(ventaItems);
  const productosData = await db.select().from(productos);

  const totalVentas = ventasData.reduce((sum, v) => sum + parseFloat(v.total?.toString() || "0"), 0);
  const totalUnidades = items.reduce((sum, i) => sum + parseFloat(i.cantidad?.toString() || "0"), 0);

  // El descuento general de cada venta se reparte proporcionalmente entre sus líneas.
  const factorVenta = new Map(ventasData.map(v => {
    const sub = parseFloat(v.subtotal?.toString() || "0");
    return [v.id, sub > 0 ? parseFloat(v.total?.toString() || "0") / sub : 1];
  }));

  const porProducto: Record<string, { cantidad: number; total: number }> = {};
  items.forEach(i => {
    const key = i.productoId?.toString() || "unknown";
    if (!porProducto[key]) porProducto[key] = { cantidad: 0, total: 0 };
    porProducto[key].cantidad += parseFloat(i.cantidad?.toString() || "0");
    porProducto[key].total += parseFloat(i.subtotal?.toString() || "0") * (factorVenta.get(i.ventaId) ?? 1);
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
  // El stock se guarda como texto: se compara como número, no alfabéticamente.
  return db.select().from(productos).where(sql`CAST(${productos.stock} AS REAL) <= ${limite}`).orderBy(productos.nombre);
}
