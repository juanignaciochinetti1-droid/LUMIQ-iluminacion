import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import * as svc from "./services";
import { CONDICIONES_PAGO, ESTADOS_COTIZACION } from "../drizzle/schema";

// ==================== SCHEMAS ====================
const pct = z.coerce.number().min(0).max(100);
const texto = z.string().trim().max(500);
const textoOpcional = texto.optional();

const productoSchema = z.object({
  codigo: textoOpcional,
  codigoProveedor: textoOpcional,
  nombre: texto.min(1, "Ingresá el nombre"),
  unidad: texto.min(1).default("u"),
  stock: z.coerce.number().default(0),
  costo: z.coerce.number().min(0).default(0),
  precioVenta: z.coerce.number().min(0).default(0),
  descuentoContado: pct.default(0),
});

const recetaSchema = z.object({
  productoId: z.number(),
  insumoId: z.number(),
  cantidad: z.coerce.number().positive(),
  unidad: z.string().min(1),
});

const produccionSchema = z.object({
  fecha: z.string().min(1),
  productoId: z.number(),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  responsable: z.string().trim().min(1, "Ingresá el responsable"),
  costoMP: z.coerce.number().min(0).default(0),
});

const clienteSchema = z.object({
  nombre: texto.min(1, "Ingresá nombre y apellido"),
  dni: textoOpcional,
  telefono: textoOpcional,
  direccion: textoOpcional,
  tieneCuentaCorriente: z.boolean().optional(),
});

const lineaSchema = z.object({
  productoId: z.number().int(),
  cantidad: z.coerce.number().positive("La cantidad debe ser mayor a 0"),
  precioUnitario: z.coerce.number().min(0),
  descuento: pct.default(0),
});

const items = z.array(lineaSchema).min(1, "Cargá al menos un artículo").max(50);

const ventaSchema = z.object({
  fecha: z.string().min(1),
  clienteId: z.number().nullish(),
  nuevoCliente: clienteSchema.nullish(),
  dniCuit: textoOpcional,
  direccion: textoOpcional,
  localidad: textoOpcional,
  entrega: z.enum(["retiro_local", "mercado_libre", "envio"]).optional(),
  condicionPago: z.enum(CONDICIONES_PAGO),
  descuento: pct.default(0),
  comentarios: z.string().max(2000).optional(),
  items,
});

const cotizacionSchema = z.object({
  fecha: z.string().min(1),
  clienteId: z.number().nullish(),
  nuevoCliente: clienteSchema.nullish(),
  condicionPago: z.enum(CONDICIONES_PAGO),
  descuento: pct.default(0),
  estado: z.enum(ESTADOS_COTIZACION).default("pendiente"),
  comentarios: z.string().max(2000).optional(),
  items,
});

/** Convierte el error de código duplicado de SQLite en un mensaje entendible. */
function conMensajeDeCodigo<T>(fn: () => Promise<T>): Promise<T> {
  return fn().catch((e: any) => {
    if (String(e?.message ?? e).includes("UNIQUE constraint failed: productos.codigo")) {
      throw new TRPCError({ code: "CONFLICT", message: "Ya existe un producto con ese código interno." });
    }
    throw e;
  });
}

const vacioANull = (v?: string) => (v && v.trim() ? v.trim() : null);

// ==================== ROUTERS ====================
export const gestionRouter = router({
  // PRODUCTOS (incluye lo que antes eran insumos)
  productos: router({
    list: publicProcedure.query(() => db.getProductos()),
    getById: publicProcedure.input(z.number()).query(({ input }) => db.getProductoById(input)),
    create: publicProcedure.input(productoSchema).mutation(({ input }) =>
      conMensajeDeCodigo(() => db.createProducto({
        codigo: vacioANull(input.codigo),
        codigoProveedor: vacioANull(input.codigoProveedor),
        nombre: input.nombre,
        unidad: input.unidad,
        stock: input.stock.toString(),
        costo: input.costo.toString(),
        precioVenta: input.precioVenta.toString(),
        descuentoContado: input.descuentoContado.toString(),
      }))
    ),
    update: publicProcedure.input(productoSchema.partial().extend({ id: z.number() })).mutation(({ input }) => {
      const { id, ...data } = input;
      const dataToUpdate: Record<string, unknown> = {};
      if (data.codigo !== undefined) dataToUpdate.codigo = vacioANull(data.codigo);
      if (data.codigoProveedor !== undefined) dataToUpdate.codigoProveedor = vacioANull(data.codigoProveedor);
      if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre;
      if (data.unidad !== undefined) dataToUpdate.unidad = data.unidad;
      if (data.stock !== undefined) dataToUpdate.stock = data.stock.toString();
      if (data.costo !== undefined) dataToUpdate.costo = data.costo.toString();
      if (data.precioVenta !== undefined) dataToUpdate.precioVenta = data.precioVenta.toString();
      if (data.descuentoContado !== undefined) dataToUpdate.descuentoContado = data.descuentoContado.toString();
      return conMensajeDeCodigo(() => db.updateProducto(id, dataToUpdate));
    }),
    delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
      const usadoEn = db.getRecetasQueUsan(input);
      if (usadoEn.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `No se puede eliminar: se usa como componente en ${usadoEn.length} receta(s). Quitalo de esas recetas primero.`,
        });
      }
      for (const r of await db.getRecetasByProducto(input)) await db.deleteReceta(r.id);
      return db.deleteProducto(input);
    }),
  }),

  // RECETAS
  recetas: router({
    list: publicProcedure.query(() => db.getRecetas()),
    byProducto: publicProcedure.input(z.number()).query(({ input }) => db.getRecetasByProducto(input)),
    create: publicProcedure.input(recetaSchema).mutation(({ input }) => {
      if (input.productoId === input.insumoId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Un producto no puede ser componente de sí mismo." });
      }
      return db.createReceta({
        productoId: input.productoId,
        insumoId: input.insumoId,
        cantidad: input.cantidad.toString(),
        unidad: input.unidad,
      });
    }),
    update: publicProcedure.input(z.object({
      id: z.number(),
      insumoId: z.number().optional(),
      cantidad: z.coerce.number().positive().optional(),
      unidad: z.string().min(1).optional(),
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      const actual = await db.getRecetaById(id);
      if (!actual) throw new TRPCError({ code: "NOT_FOUND", message: "Componente no encontrado" });
      if (data.insumoId !== undefined && data.insumoId === actual.productoId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Un producto no puede ser componente de sí mismo." });
      }
      const dataToUpdate: Record<string, unknown> = {};
      if (data.cantidad !== undefined) dataToUpdate.cantidad = data.cantidad.toString();
      if (data.insumoId !== undefined) dataToUpdate.insumoId = data.insumoId;
      if (data.unidad !== undefined) dataToUpdate.unidad = data.unidad;
      return db.updateReceta(id, dataToUpdate);
    }),
    delete: publicProcedure.input(z.number()).mutation(({ input }) => db.deleteReceta(input)),
  }),

  // PRODUCCION
  produccion: router({
    list: publicProcedure.query(() => db.getProduccion()),
    create: publicProcedure.input(produccionSchema).mutation(({ input }) => {
      svc.crearProduccion(input);
      return { success: true };
    }),
    update: publicProcedure.input(produccionSchema.extend({ id: z.number() })).mutation(({ input }) => {
      const { id, ...data } = input;
      svc.editarProduccion(id, data);
      return { success: true };
    }),
    delete: publicProcedure.input(z.number()).mutation(({ input }) => {
      svc.eliminarProduccion(input);
      return { success: true };
    }),
  }),

  // CLIENTES
  clientes: router({
    list: publicProcedure.query(() => db.getClientes()),
    create: publicProcedure.input(clienteSchema).mutation(({ input }) => ({ id: svc.crearCliente(input) })),
    update: publicProcedure.input(clienteSchema.extend({ id: z.number() })).mutation(({ input }) => {
      const { id, ...data } = input;
      svc.actualizarCliente(id, data);
      return { success: true };
    }),
    delete: publicProcedure.input(z.number()).mutation(({ input }) => {
      svc.eliminarCliente(input);
      return { success: true };
    }),
  }),

  // CUENTA CORRIENTE
  cuentaCorriente: router({
    movimientos: publicProcedure.input(z.number()).query(({ input }) => svc.listarMovimientos(input)),
    registrarPago: publicProcedure.input(z.object({
      clienteId: z.number(),
      fecha: z.string().min(1),
      monto: z.coerce.number().positive("El monto debe ser mayor a 0"),
      concepto: textoOpcional,
    })).mutation(({ input }) => {
      svc.registrarPago(input);
      return { success: true };
    }),
    eliminarMovimiento: publicProcedure.input(z.number()).mutation(({ input }) => {
      svc.eliminarMovimiento(input);
      return { success: true };
    }),
  }),

  // VENTAS
  ventas: router({
    list: publicProcedure.query(() => svc.listarVentas()),
    create: publicProcedure.input(ventaSchema).mutation(({ input }) => {
      const venta = svc.crearVenta(input);
      return { success: true, id: venta.id, numero: venta.numero };
    }),
    delete: publicProcedure.input(z.number()).mutation(({ input }) => {
      svc.eliminarVenta(input);
      return { success: true };
    }),
    /** Asigna (si todavía no tiene) el número de remito de la venta y lo devuelve. */
    generarRemito: publicProcedure.input(z.number()).mutation(({ input }) => ({
      remitoNumero: svc.generarRemito(input),
    })),
  }),

  // COTIZACIONES
  cotizaciones: router({
    list: publicProcedure.query(() => svc.listarCotizaciones()),
    create: publicProcedure.input(cotizacionSchema).mutation(({ input }) => {
      const cot = svc.crearCotizacion(input);
      return { success: true, id: cot.id, numero: cot.numero };
    }),
    update: publicProcedure.input(cotizacionSchema.extend({ id: z.number() })).mutation(({ input }) => {
      const { id, ...data } = input;
      svc.actualizarCotizacion(id, data);
      return { success: true };
    }),
    delete: publicProcedure.input(z.number()).mutation(({ input }) => {
      svc.eliminarCotizacion(input);
      return { success: true };
    }),
  }),

  // DASHBOARD
  dashboard: router({
    stats: publicProcedure.query(() => db.getDashboardStats()),
    stockBajo: publicProcedure.query(() => db.getStockBajo()),
  }),

  // REPORTES
  reportes: router({
    ventasMensuales: publicProcedure
      .input(z.object({ mes: z.number(), año: z.number() }))
      .query(async ({ input }) => {
        const { generarHTMLVentasMensuales } = await import('./pdf-generator');
        // Parsear fecha directamente del string "YYYY-MM-DD" para evitar bug de timezone
        const ventasFiltradas = svc.listarVentas().filter(v => {
          const [year, month] = v.fecha.split('-').map(Number);
          return month === input.mes && year === input.año;
        });
        return generarHTMLVentasMensuales(ventasFiltradas, input.mes, input.año);
      }),

    stockMensual: publicProcedure.query(async () => {
      const { generarHTMLStockMensual } = await import('./pdf-generator');
      return generarHTMLStockMensual(await db.getProductos());
    }),
  }),
});

export type GestionRouter = typeof gestionRouter;
