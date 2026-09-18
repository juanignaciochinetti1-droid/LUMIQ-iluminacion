import { beforeAll, describe, expect, it } from "vitest";
import Database from "better-sqlite3";
import { mkdtempSync } from "fs";
import { tmpdir } from "os";
import path from "path";

// La base se crea con el esquema ANTERIOR (insumos separados, ventas de un solo renglón)
// para comprobar que la migración automática conserva los datos.
const dbPath = path.join(mkdtempSync(path.join(tmpdir(), "lumiq-test-")), "legacy.db");
process.env.SQLITE_DB_PATH = dbPath;

const T = "2026-01-01T00:00:00.000Z";

function crearBaseAnterior() {
  const old = new Database(dbPath);
  old.exec(`
    CREATE TABLE insumos (id INTEGER PRIMARY KEY AUTOINCREMENT, codigo TEXT NOT NULL UNIQUE, descripcion TEXT NOT NULL,
      cantidad TEXT DEFAULT '0', unidad TEXT NOT NULL, precioUnitario TEXT DEFAULT '0', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE productos (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL, stock TEXT DEFAULT '0',
      precioVenta TEXT DEFAULT '0', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL, codigo TEXT UNIQUE, costo TEXT);
    CREATE TABLE recetas (id INTEGER PRIMARY KEY AUTOINCREMENT, productoId INTEGER NOT NULL, insumoId INTEGER NOT NULL,
      cantidad TEXT NOT NULL, unidad TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE produccion (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, productoId INTEGER NOT NULL,
      cantidad TEXT NOT NULL, responsable TEXT NOT NULL, costoMP TEXT DEFAULT '0', createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE ventas (id INTEGER PRIMARY KEY AUTOINCREMENT, fecha TEXT NOT NULL, remito TEXT, dniCuit TEXT, direccion TEXT,
      localidad TEXT, productoId INTEGER NOT NULL, cantidad TEXT NOT NULL, precioUnitario TEXT NOT NULL, total TEXT NOT NULL,
      createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);

    INSERT INTO productos (id, nombre, stock, precioVenta, createdAt, updatedAt, codigo) VALUES
      (1, 'Lampara A', '5', '100', '${T}', '${T}', 'PROD-A'),
      (2, 'Lampara B', '0', '200', '${T}', '${T}', 'INS-001');
    INSERT INTO insumos (id, codigo, descripcion, cantidad, unidad, precioUnitario, createdAt, updatedAt) VALUES
      (1, 'INS-001', 'Tornillo', '100', 'u', '2', '${T}', '${T}'),
      (2, 'INS-002', 'Cable', '50', 'm', '10', '${T}', '${T}');
    INSERT INTO recetas (productoId, insumoId, cantidad, unidad, createdAt, updatedAt) VALUES
      (2, 1, '2', 'u', '${T}', '${T}'), (2, 2, '1.5', 'm', '${T}', '${T}');
    INSERT INTO ventas (id, fecha, remito, dniCuit, productoId, cantidad, precioUnitario, total, createdAt, updatedAt) VALUES
      (1, '2025-12-10', '77', '20-1', 1, '1', '100', '100', '${T}', '${T}'),
      (2, '2025-12-11', NULL, '20-2', 1, '2', '100', '200', '${T}', '${T}');
  `);
  old.close();
}

let appRouter: typeof import("./routers").appRouter;
let svc: typeof import("./services");
let dbm: typeof import("./db");
let caller: ReturnType<(typeof import("./routers"))["appRouter"]["createCaller"]>;

const stockDe = (id: number) => parseFloat(dbm.sqlite.prepare("SELECT stock FROM productos WHERE id=?").get(id)!.stock as string);
const idPorCodigo = (codigo: string) => (dbm.sqlite.prepare("SELECT id FROM productos WHERE codigo=?").get(codigo) as any).id as number;

beforeAll(async () => {
  crearBaseAnterior();
  dbm = await import("./db");
  svc = await import("./services");
  appRouter = (await import("./routers")).appRouter;
  caller = appRouter.createCaller({ user: null, req: {} as any, res: {} as any });
});

describe("migración desde el esquema anterior", () => {
  it("pasa los insumos a productos sin perder datos", () => {
    const tornillo = dbm.sqlite.prepare("SELECT * FROM productos WHERE nombre='Tornillo'").get() as any;
    expect(tornillo).toMatchObject({ unidad: "u", stock: "100", costo: "2" });
    // 'INS-001' ya estaba usado por un producto: el insumo migrado recibe otro código
    expect(tornillo.codigo).toBe("INS-001-INS");
    expect(dbm.sqlite.prepare("SELECT COUNT(*) n FROM productos").get()).toEqual({ n: 4 });
    expect(dbm.sqlite.prepare("SELECT name FROM sqlite_master WHERE name='insumos'").get()).toBeUndefined();
  });

  it("reapunta las recetas a los nuevos ids (aunque coincidan con otros productos)", () => {
    const comp = dbm.sqlite.prepare(`
      SELECT p.nombre FROM recetas r JOIN productos p ON p.id = r.insumoId WHERE r.productoId = 2 ORDER BY r.id
    `).all().map((r: any) => r.nombre);
    expect(comp).toEqual(["Tornillo", "Cable"]);
  });

  it("convierte las ventas viejas a cabecera + una línea, con numeración correlativa", async () => {
    const ventas = svc.listarVentas().sort((a, b) => a.numero - b.numero);
    expect(ventas.map(v => v.numero)).toEqual([1, 2]);
    expect(ventas[0]).toMatchObject({ remito: "77", remitoNumero: null, total: "100", condicionPago: "lista" });
    expect(ventas[1].items).toHaveLength(1);
    expect(ventas[1].items[0]).toMatchObject({ productoId: 1, cantidad: "2", subtotal: "200" });
  });

  it("es idempotente: volver a inicializar no duplica nada", () => {
    dbm.initializeTables();
    expect(dbm.sqlite.prepare("SELECT COUNT(*) n FROM productos").get()).toEqual({ n: 4 });
    expect(dbm.sqlite.prepare("SELECT COUNT(*) n FROM ventas").get()).toEqual({ n: 2 });
  });
});

describe("producción: crear, editar y eliminar", () => {
  const base = { fecha: "2026-02-01", productoId: 2, responsable: "Ana", costoMP: 0 };
  let tornillo: number, cable: number;
  beforeAll(() => { tornillo = idPorCodigo("INS-001-INS"); cable = idPorCodigo("INS-002"); });

  it("descuenta componentes y suma stock", () => {
    svc.crearProduccion({ ...base, cantidad: 4 });
    expect(stockDe(tornillo)).toBe(92);
    expect(stockDe(cable)).toBe(44);
    expect(stockDe(2)).toBe(4);
  });

  it("al editar la cantidad recalcula stock e insumos", async () => {
    const id = (await caller.produccion.list())[0].id;
    await caller.produccion.update({ id, ...base, cantidad: 2 });
    expect(stockDe(tornillo)).toBe(96);
    expect(stockDe(cable)).toBe(47);
    expect(stockDe(2)).toBe(2);
  });

  it("si la edición no es posible, no cambia nada", async () => {
    const id = (await caller.produccion.list())[0].id;
    await expect(caller.produccion.update({ id, ...base, cantidad: 1000 })).rejects.toThrow(/Insumo insuficiente/);
    expect(stockDe(tornillo)).toBe(96);
    expect(stockDe(cable)).toBe(47);
    expect(stockDe(2)).toBe(2);
    expect(parseFloat((await caller.produccion.list())[0].cantidad)).toBe(2);
  });

  it("no deja eliminar si lo producido ya se vendió", async () => {
    const id = (await caller.produccion.list())[0].id;
    dbm.sqlite.prepare("UPDATE productos SET stock='1' WHERE id=2").run(); // simula venta de 1
    await expect(caller.produccion.delete(id)).rejects.toThrow(/Parte ya se vendió/);
    dbm.sqlite.prepare("UPDATE productos SET stock='2' WHERE id=2").run();
  });

  it("eliminar restituye los insumos y quita el stock", async () => {
    const id = (await caller.produccion.list())[0].id;
    await caller.produccion.delete(id);
    expect(stockDe(tornillo)).toBe(100);
    expect(stockDe(cable)).toBe(50);
    expect(stockDe(2)).toBe(0);
    expect(await caller.produccion.list()).toHaveLength(0);
  });
});

describe("ventas: varias líneas, descuentos y numeración", () => {
  const linea = (productoId: number, cantidad: number, precioUnitario: number, descuento = 0) =>
    ({ productoId, cantidad, precioUnitario, descuento });

  it("acepta 10 o más artículos y calcula totales con descuentos en el servidor", async () => {
    dbm.sqlite.prepare("UPDATE productos SET stock='1000' WHERE id IN (1, 2)").run();
    const items = Array.from({ length: 12 }, (_, i) => linea(i % 2 === 0 ? 1 : 2, 1, 100, i === 0 ? 10 : 0));
    const r = await caller.ventas.create({ fecha: "2026-02-02", condicionPago: "lista", descuento: 5, items, comentarios: " entregar de tarde " });
    expect(r.numero).toBe(3); // continúa la numeración de las ventas migradas
    const v = svc.listarVentas().find(x => x.id === r.id)!;
    expect(v.items).toHaveLength(12);
    // 11 líneas de $100 + una con 10% de descuento ($90) = $1190; con 5% general = $1130.50
    expect(v).toMatchObject({ subtotal: "1190", total: "1130.5", comentarios: "entregar de tarde" });
    expect(stockDe(1)).toBe(994);
  });

  it("valida stock sumando las líneas del mismo producto y no deja nada a medias", async () => {
    dbm.sqlite.prepare("UPDATE productos SET stock='3' WHERE id=1").run();
    await expect(caller.ventas.create({
      fecha: "2026-02-02", condicionPago: "lista", descuento: 0,
      items: [linea(1, 2, 10), linea(1, 2, 10)],
    })).rejects.toThrow(/Stock insuficiente/);
    expect(stockDe(1)).toBe(3);
    expect(svc.listarVentas()).toHaveLength(3);
  });

  it("los números de venta y de remito son correlativos e independientes", async () => {
    const [a, b] = svc.listarVentas().sort((x, y) => x.numero - y.numero).slice(-2);
    const rem1 = await caller.ventas.generarRemito(b.id);
    const rem2 = await caller.ventas.generarRemito(a.id);
    expect(rem1.remitoNumero).toBe(1);
    expect(rem2.remitoNumero).toBe(2);
    expect((await caller.ventas.generarRemito(b.id)).remitoNumero).toBe(1); // no se reasigna
    const v = await caller.ventas.create({ fecha: "2026-02-03", condicionPago: "lista", descuento: 0, items: [linea(1, 1, 50)] });
    expect(v.numero).toBe(4);
    expect((await caller.ventas.generarRemito(v.id)).remitoNumero).toBe(3);
  });

  it("no reutiliza números al eliminar la última venta", async () => {
    const ultima = svc.listarVentas().find(v => v.numero === 4)!;
    await caller.ventas.delete(ultima.id);
    const nueva = await caller.ventas.create({ fecha: "2026-02-03", condicionPago: "lista", descuento: 0, items: [linea(1, 1, 50)] });
    expect(nueva.numero).toBe(5);
  });

  it("eliminar una venta restaura el stock", async () => {
    dbm.sqlite.prepare("UPDATE productos SET stock='10' WHERE id=1").run();
    const r = await caller.ventas.create({ fecha: "2026-02-04", condicionPago: "lista", descuento: 0, items: [linea(1, 4, 10)] });
    expect(stockDe(1)).toBe(6);
    await caller.ventas.delete(r.id);
    expect(stockDe(1)).toBe(10);
  });
});

describe("clientes y cuenta corriente", () => {
  const items = [{ productoId: 1, cantidad: 1, precioUnitario: 100, descuento: 0 }];

  it("no permite vender en cuenta corriente a quien no la tiene", async () => {
    const { id } = await caller.clientes.create({ nombre: "Juan Pérez", dni: "30111222" });
    await expect(caller.ventas.create({
      fecha: "2026-03-01", condicionPago: "cuenta_corriente", descuento: 0, clienteId: id, items,
    })).rejects.toThrow(/cuenta corriente/);
    await expect(caller.ventas.create({
      fecha: "2026-03-01", condicionPago: "cuenta_corriente", descuento: 0, items,
    })).rejects.toThrow(/cuenta corriente/);
  });

  it("la venta genera un cargo, los pagos lo reducen y borrar la venta lo quita", async () => {
    dbm.sqlite.prepare("UPDATE productos SET stock='50' WHERE id=1").run();
    const { id: clienteId } = await caller.clientes.create({
      nombre: "María López", dni: "27333444", telefono: "11-5555", direccion: "Calle 1", tieneCuentaCorriente: true,
    });
    const venta = await caller.ventas.create({
      fecha: "2026-03-02", condicionPago: "cuenta_corriente", descuento: 10, clienteId,
      items: [{ productoId: 1, cantidad: 2, precioUnitario: 100, descuento: 0 }],
    });
    // Los datos del cliente se completan en la venta
    expect(svc.listarVentas().find(v => v.id === venta.id)).toMatchObject({ dniCuit: "27333444", direccion: "Calle 1", clienteNombre: "María López" });

    expect((await caller.clientes.list()).find(c => c.id === clienteId)!.saldo).toBe(180);
    await caller.cuentaCorriente.registrarPago({ clienteId, fecha: "2026-03-03", monto: 80, concepto: "Efectivo" });
    const movs = await caller.cuentaCorriente.movimientos(clienteId);
    expect(movs.map(m => [m.tipo, m.saldoAcumulado])).toEqual([["cargo", 180], ["pago", 100]]);

    await expect(caller.cuentaCorriente.eliminarMovimiento(movs[0].id)).rejects.toThrow(/borrando la venta/);
    await expect(caller.clientes.delete(clienteId)).rejects.toThrow(/No se puede eliminar/);
    await expect(caller.clientes.update({ id: clienteId, nombre: "María López", tieneCuentaCorriente: false })).rejects.toThrow(/saldo pendiente/);

    await caller.ventas.delete(venta.id);
    const restantes = await caller.cuentaCorriente.movimientos(clienteId);
    expect(restantes.map(m => m.tipo)).toEqual(["pago"]);
  });

  it("puede crear el cliente en el momento de la venta", async () => {
    const r = await caller.ventas.create({
      fecha: "2026-03-04", condicionPago: "contado", descuento: 0, items,
      nuevoCliente: { nombre: "Cliente Nuevo", telefono: "11-1234" },
    });
    const v = svc.listarVentas().find(x => x.id === r.id)!;
    expect(v.clienteNombre).toBe("Cliente Nuevo");
    expect((await caller.clientes.list()).some(c => c.nombre === "Cliente Nuevo")).toBe(true);
  });
});

describe("cotizaciones", () => {
  it("se numeran aparte, no tocan el stock y pueden editarse", async () => {
    const antes = stockDe(1);
    const r = await caller.cotizaciones.create({
      fecha: "2026-04-01", condicionPago: "contado", descuento: 0,
      nuevoCliente: { nombre: "Cotiza SA", dni: "30-1", direccion: "Av. 2" },
      items: [{ productoId: 1, cantidad: 3, precioUnitario: 100, descuento: 10 }],
    });
    expect(r.numero).toBe(1);
    expect(stockDe(1)).toBe(antes);
    const cot = (await caller.cotizaciones.list())[0];
    expect(cot).toMatchObject({ clienteNombre: "Cotiza SA", subtotal: "270", total: "270", estado: "pendiente" });

    await caller.cotizaciones.update({
      id: r.id, fecha: "2026-04-01", condicionPago: "lista", descuento: 10, estado: "aceptada", clienteId: cot.clienteId,
      items: [
        { productoId: 1, cantidad: 1, precioUnitario: 100, descuento: 0 },
        { productoId: 2, cantidad: 2, precioUnitario: 50, descuento: 0 },
      ],
    });
    const editada = (await caller.cotizaciones.list())[0];
    expect(editada.items).toHaveLength(2);
    expect(editada).toMatchObject({ total: "180", estado: "aceptada", numero: 1 });
  });
});

describe("productos unificados", () => {
  it("guarda código interno, código proveedor, precio de lista y descuento de contado", async () => {
    await caller.productos.create({
      codigo: "LAM-01", codigoProveedor: "PROV-9", nombre: "Lámpara X", unidad: "u",
      stock: 3, costo: 50, precioVenta: 200, descuentoContado: 15,
    });
    const p = (await caller.productos.list()).find(x => x.codigo === "LAM-01")!;
    expect(p).toMatchObject({ codigoProveedor: "PROV-9", precioVenta: "200", descuentoContado: "15" });
  });

  it("rechaza códigos internos repetidos con un mensaje claro", async () => {
    await expect(caller.productos.create({ codigo: "LAM-01", nombre: "Otra", unidad: "u" }))
      .rejects.toThrow(/código interno/);
  });

  it("varios productos sin código no chocan entre sí", async () => {
    await caller.productos.create({ nombre: "Sin código 1", unidad: "u" });
    await caller.productos.create({ nombre: "Sin código 2", unidad: "u" });
  });

  it("no elimina un producto que es componente de una receta", async () => {
    const tornillo = idPorCodigo("INS-001-INS");
    await expect(caller.productos.delete(tornillo)).rejects.toThrow(/componente/);
  });

  it("un producto no puede ser componente de sí mismo", async () => {
    await expect(caller.recetas.create({ productoId: 2, insumoId: 2, cantidad: 1, unidad: "u" })).rejects.toThrow(/sí mismo/);
  });
});
