import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

// ==================== SCHEMAS ====================
const insumoSchema = z.object({
  codigo: z.string(),
  descripcion: z.string(),
  cantidad: z.coerce.number().default(0),
  unidad: z.string(),
  precioUnitario: z.coerce.number().default(0),
});

const productoSchema = z.object({
  nombre: z.string(),
  stock: z.coerce.number().default(0),
  precioVenta: z.coerce.number().default(0),
});

const recetaSchema = z.object({
  productoId: z.number(),
  insumoId: z.number(),
  cantidad: z.coerce.number(),
  unidad: z.string(),
});

const produccionSchema = z.object({
  fecha: z.string(),
  productoId: z.number(),
  cantidad: z.coerce.number(),
  responsable: z.string(),
  costoMP: z.coerce.number().default(0),
});

const ventaSchema = z.object({
  fecha: z.string(),
  remito: z.string().optional(),
  dniCuit: z.string().optional(),
  direccion: z.string().optional(),
  localidad: z.string().optional(),
  productoId: z.number(),
  cantidad: z.coerce.number(),
  precioUnitario: z.coerce.number(),
  total: z.coerce.number(),
});

// ==================== ROUTERS ====================
export const gestionRouter = router({
  // INSUMOS
  insumos: router({
    list: publicProcedure.query(() => db.getInsumos()),
    getById: publicProcedure.input(z.number()).query(({ input }) => db.getInsumoById(input)),
    create: publicProcedure.input(insumoSchema).mutation(({ input }) => {
      return db.createInsumo({
        codigo: input.codigo,
        descripcion: input.descripcion,
        cantidad: input.cantidad.toString(),
        unidad: input.unidad,
        precioUnitario: input.precioUnitario.toString(),
      });
    }),
    update: publicProcedure.input(z.object({
      id: z.number(),
      codigo: z.string().optional(),
      descripcion: z.string().optional(),
      cantidad: z.coerce.number().optional(),
      unidad: z.string().optional(),
      precioUnitario: z.coerce.number().optional(),
    })).mutation(({ input }) => {
      const { id, ...data } = input;
      const dataToUpdate: any = {};
      if (data.cantidad !== undefined) dataToUpdate.cantidad = data.cantidad.toString();
      if (data.precioUnitario !== undefined) dataToUpdate.precioUnitario = data.precioUnitario.toString();
      if (data.codigo !== undefined) dataToUpdate.codigo = data.codigo;
      if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion;
      if (data.unidad !== undefined) dataToUpdate.unidad = data.unidad;
      return db.updateInsumo(id, dataToUpdate);
    }),
    delete: publicProcedure.input(z.number()).mutation(({ input }) => db.deleteInsumo(input)),
  }),

  // PRODUCTOS
  productos: router({
    list: publicProcedure.query(() => db.getProductos()),
    getById: publicProcedure.input(z.number()).query(({ input }) => db.getProductoById(input)),
    create: publicProcedure.input(productoSchema).mutation(({ input }) => {
      return db.createProducto({
        nombre: input.nombre,
        stock: input.stock.toString(),
        precioVenta: input.precioVenta.toString(),
      });
    }),
    update: publicProcedure.input(z.object({
      id: z.number(),
      nombre: z.string().optional(),
      stock: z.coerce.number().optional(),
      precioVenta: z.coerce.number().optional(),
    })).mutation(({ input }) => {
      const { id, ...data } = input;
      const dataToUpdate: any = {};
      if (data.stock !== undefined) dataToUpdate.stock = data.stock.toString();
      if (data.precioVenta !== undefined) dataToUpdate.precioVenta = data.precioVenta.toString();
      if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre;
      return db.updateProducto(id, dataToUpdate);
    }),
    delete: publicProcedure.input(z.number()).mutation(({ input }) => db.deleteProducto(input)),
  }),

  // RECETAS
  recetas: router({
    list: publicProcedure.query(() => db.getRecetas()),
    byProducto: publicProcedure.input(z.number()).query(({ input }) => db.getRecetasByProducto(input)),
    create: publicProcedure.input(recetaSchema).mutation(({ input }) => {
      return db.createReceta({
        productoId: input.productoId,
        insumoId: input.insumoId,
        cantidad: input.cantidad.toString(),
        unidad: input.unidad,
      });
    }),
    update: publicProcedure.input(z.object({
      id: z.number(),
      productoId: z.number().optional(),
      insumoId: z.number().optional(),
      cantidad: z.coerce.number().optional(),
      unidad: z.string().optional(),
    })).mutation(({ input }) => {
      const { id, ...data } = input;
      const dataToUpdate: any = {};
      if (data.cantidad !== undefined) dataToUpdate.cantidad = data.cantidad.toString();
      if (data.productoId !== undefined) dataToUpdate.productoId = data.productoId;
      if (data.insumoId !== undefined) dataToUpdate.insumoId = data.insumoId;
      if (data.unidad !== undefined) dataToUpdate.unidad = data.unidad;
      return db.updateReceta(id, dataToUpdate);
    }),
    delete: publicProcedure.input(z.number()).mutation(({ input }) => db.deleteReceta(input)),
  }),

  // PRODUCCION
  produccion: router({
    list: publicProcedure.query(() => db.getProduccion()),
    create: publicProcedure.input(produccionSchema).mutation(async ({ input }) => {
      // Validar que existan recetas para el producto
      const recetas = await db.getRecetasByProducto(input.productoId);

      // Validar insumos suficientes antes de crear nada
      for (const receta of recetas) {
        const insumo = await db.getInsumoById(receta.insumoId);
        if (!insumo) {
          throw new TRPCError({ code: "NOT_FOUND", message: `Insumo de receta no encontrado (id: ${receta.insumoId})` });
        }
        const necesario = parseFloat(receta.cantidad?.toString() || "0") * input.cantidad;
        const disponible = parseFloat(insumo.cantidad?.toString() || "0");
        if (disponible < necesario - 0.001) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Insumo insuficiente: "${insumo.descripcion}". Necesario: ${necesario.toFixed(3)} ${insumo.unidad}, Disponible: ${disponible.toFixed(3)} ${insumo.unidad}`,
          });
        }
      }

      // Crear registro de producción
      await db.createProduccion({
        fecha: new Date(input.fecha),
        productoId: input.productoId,
        cantidad: input.cantidad.toString(),
        responsable: input.responsable,
        costoMP: input.costoMP.toString(),
      });

      // Descontar insumos
      for (const receta of recetas) {
        const cantidadADescontar = parseFloat(receta.cantidad?.toString() || "0") * input.cantidad;
        await db.decrementInsumoStock(receta.insumoId, cantidadADescontar);
      }

      // Sumar stock del producto
      await db.updateProductoStock(input.productoId, input.cantidad);

      return { success: true };
    }),
    delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
      // Restaurar stock del producto al eliminar
      const prod = await db.getProduccionById(input);
      if (prod) {
        const cantidad = parseFloat(prod.cantidad?.toString() || "0");
        await db.updateProductoStock(prod.productoId, -cantidad);
      }
      return db.deleteProduccion(input);
    }),
  }),

  // VENTAS
  ventas: router({
    list: publicProcedure.query(() => db.getVentas()),
    create: publicProcedure.input(ventaSchema).mutation(async ({ input }) => {
      // Validar stock disponible
      const producto = await db.getProductoById(input.productoId);
      if (!producto) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Producto no encontrado" });
      }
      const stockActual = parseFloat(producto.stock?.toString() || "0");
      if (stockActual < input.cantidad - 0.001) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Stock insuficiente. Disponible: ${stockActual.toFixed(3)} unidades`,
        });
      }

      // Calcular total en el servidor (no confiar en el frontend)
      const total = input.cantidad * input.precioUnitario;

      await db.createVenta({
        fecha: new Date(input.fecha),
        remito: input.remito,
        dniCuit: input.dniCuit,
        direccion: input.direccion,
        localidad: input.localidad,
        productoId: input.productoId,
        cantidad: input.cantidad.toString(),
        precioUnitario: input.precioUnitario.toString(),
        total: total.toString(),
      });

      // Descontar stock
      await db.updateProductoStock(input.productoId, -input.cantidad);

      return { success: true };
    }),
    delete: publicProcedure.input(z.number()).mutation(async ({ input }) => {
      // Restaurar stock al eliminar una venta
      const venta = await db.getVentaById(input);
      if (venta) {
        const cantidad = parseFloat(venta.cantidad?.toString() || "0");
        await db.updateProductoStock(venta.productoId, cantidad);
      }
      return db.deleteVenta(input);
    }),
  }),

  // DASHBOARD
  dashboard: router({
    stats: publicProcedure.query(() => db.getDashboardStats()),
    stockBajo: publicProcedure.query(() => db.getStockBajo()),
    insumosBajo: publicProcedure.query(() => db.getInsumosBajo()),
  }),

  // REPORTES
  reportes: router({
    ventasMensuales: publicProcedure
      .input(z.object({ mes: z.number(), año: z.number() }))
      .query(async ({ input }) => {
        const { generarHTMLVentasMensuales } = await import('./pdf-generator');
        const ventas = await db.getVentas();
        const productos = await db.getProductos();
        // Parsear fecha directamente del string "YYYY-MM-DD" para evitar bug de timezone
        const ventasFiltradas = ventas.filter(v => {
          const [year, month] = (v.fecha as unknown as string).split('-').map(Number);
          return month === input.mes && year === input.año;
        });
        return generarHTMLVentasMensuales(ventasFiltradas, productos, input.mes, input.año);
      }),

    stockMensual: publicProcedure.query(async () => {
      const { generarHTMLStockMensual } = await import('./pdf-generator');
      const productos = await db.getProductos();
      const insumos = await db.getInsumos();
      return generarHTMLStockMensual(productos, insumos);
    }),
  }),
});

export type GestionRouter = typeof gestionRouter;
