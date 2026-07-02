# Sistema de Gestión Empresarial - TODO

## Base de Datos y Modelos
- [x] Diseñar esquema Drizzle con tablas: insumos, productos, recetas, producción, ventas
- [x] Crear migraciones SQL
- [x] Implementar tipos TypeScript para todas las entidades

## Procedimientos tRPC
- [x] Crear router para Insumos (CRUD + búsqueda)
- [x] Crear router para Productos (CRUD + búsqueda)
- [x] Crear router para Recetas (CRUD + búsqueda + filtro por producto)
- [x] Crear router para Producción (crear + listar + lógica automática de descuento)
- [x] Crear router para Ventas (crear + listar + lógica automática de descuento)
- [x] Crear router para Dashboard (KPIs + alertas + ranking)
- [x] Crear router para Reportes (PDF ventas mensuales + PDF stock)

## UI - Dashboard
- [x] Crear layout con navegación lateral naranja/blanco
- [x] Implementar tarjetas KPI (total ventas, unidades, más/menos vendido)
- [x] Crear tabla de alertas de stock bajo
- [x] Crear ranking de ventas por producto
- [x] Agregar botones para generar reportes

## UI - Módulo Insumos
- [x] Crear tabla con búsqueda
- [x] Implementar formulario de creación/edición
- [x] Agregar validaciones
- [x] Implementar eliminación

## UI - Módulo Productos
- [x] Crear tabla con búsqueda
- [x] Implementar formulario de creación/edición
- [x] Agregar validaciones
- [x] Implementar eliminación

## UI - Módulo Recetas
- [x] Crear tabla con búsqueda y filtro por producto
- [x] Implementar formulario con combos (producto/insumo)
- [x] Agregar validaciones
- [x] Implementar eliminación

## UI - Módulo Producción
- [x] Crear formulario con campos: fecha, producto, cantidad, responsable
- [x] Mostrar costo MP calculado automáticamente
- [x] Implementar tabla de histórico
- [x] Agregar lógica de descuento automático de insumos
- [x] Agregar lógica de suma automática de stock

## UI - Módulo Ventas
- [x] Crear formulario con campos: fecha, remito, DNI, dirección, localidad, producto, cantidad
- [x] Mostrar total calculado automáticamente
- [x] Implementar tabla de histórico
- [x] Agregar lógica de descuento automático de stock
- [x] Agregar botón para generar PDF de venta individual

## Generación de PDFs
- [x] Implementar generador de PDF para comprobante de venta
- [x] Implementar generador de informe mensual de ventas
- [x] Implementar generador de informe mensual de stock
- [x] Integrar con rutas de descarga

## Estilos y UI
- [x] Aplicar paleta naranja/blanco en toda la aplicación
- [x] Configurar Tailwind con colores personalizados
- [x] Asegurar responsive design
- [x] Optimizar tipografía y espaciado

## Pruebas y Entrega
- [x] Pruebas funcionales de CRUD
- [x] Pruebas de descuentos automáticos
- [x] Pruebas de generación de PDFs
- [x] Crear checkpoint final
- [x] Documentar instrucciones de uso
