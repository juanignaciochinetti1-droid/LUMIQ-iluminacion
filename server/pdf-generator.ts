/**
 * Generadores de HTML para los informes descargables.
 * El HTML se puede abrir en el navegador e imprimir / guardar como PDF.
 */

const esc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const num = (v: unknown) => parseFloat(v?.toString() || '0') || 0;
const money = (v: unknown) => `$${num(v).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fechaAR = (f: string) => new Date(f + 'T00:00:00').toLocaleDateString('es-AR');

const ESTILOS = `
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #ff8c42; margin: 0; }
    .header p { margin: 5px 0; }
    h2 { color: #ff8c42; border-bottom: 2px solid #ff8c42; padding-bottom: 10px; margin-top: 30px; }
    .resumen { display: flex; gap: 20px; margin: 20px 0; }
    .resumen-item { flex: 1; padding: 15px; background: #fff5e6; border-left: 4px solid #ff8c42; }
    .resumen-item .label { font-size: 12px; color: #666; }
    .resumen-item .valor { font-size: 24px; font-weight: bold; color: #ff8c42; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; }
    th { background-color: #ff8c42; color: white; padding: 8px; text-align: left; }
    td { padding: 8px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .total-row { font-weight: bold; background-color: #fff5e6; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
`;

export function generarHTMLVentasMensuales(ventas: any[], mes: number, año: number) {
  const nombreMes = new Date(año, mes - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const totalVentas = ventas.reduce((sum, v) => sum + num(v.total), 0);
  const totalUnidades = ventas.reduce(
    (sum, v) => sum + (v.items ?? []).reduce((s: number, i: any) => s + num(i.cantidad), 0), 0);

  const filasTabla = ventas.map(v => `
      <tr>
        <td>${fechaAR(v.fecha)}</td>
        <td>${v.numero}</td>
        <td>${v.remitoNumero ?? (esc(v.remito) || '-')}</td>
        <td>${esc(v.clienteNombre || v.dniCuit || '-')}</td>
        <td>${(v.items ?? []).length}</td>
        <td>${money(v.total)}</td>
      </tr>`).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Informe de Ventas</title>
  <style>${ESTILOS}</style>
</head>
<body>
  <div class="header">
    <h1>INFORME DE VENTAS</h1>
    <p>Período: ${nombreMes}</p>
    <p>Generado: ${new Date().toLocaleDateString('es-AR')}</p>
  </div>

  <div class="resumen">
    <div class="resumen-item"><div class="label">Total de Ventas</div><div class="valor">${money(totalVentas)}</div></div>
    <div class="resumen-item"><div class="label">Unidades Vendidas</div><div class="valor">${totalUnidades.toFixed(0)}</div></div>
    <div class="resumen-item"><div class="label">Cantidad de Ventas</div><div class="valor">${ventas.length}</div></div>
  </div>

  <table>
    <thead>
      <tr><th>Fecha</th><th>Venta N°</th><th>Remito N°</th><th>Cliente</th><th>Artículos</th><th>Total</th></tr>
    </thead>
    <tbody>${filasTabla}</tbody>
  </table>

  <div class="footer"><p>Generado automáticamente por el Sistema de Gestión</p></div>
</body>
</html>
  `;
}

export function generarHTMLStockMensual(productos: any[]) {
  const filas = productos.map(p => {
    const stock = num(p.stock);
    return `
    <tr>
      <td>${esc(p.codigo || '-')}</td>
      <td>${esc(p.nombre)}</td>
      <td>${stock.toFixed(3)} ${esc(p.unidad)}</td>
      <td>${money(p.costo)}</td>
      <td>${money(stock * num(p.costo))}</td>
      <td>${money(p.precioVenta)}</td>
      <td>${money(stock * num(p.precioVenta))}</td>
    </tr>`;
  }).join('');

  const valorCosto = productos.reduce((sum, p) => sum + num(p.stock) * num(p.costo), 0);
  const valorLista = productos.reduce((sum, p) => sum + num(p.stock) * num(p.precioVenta), 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Informe de Stock</title>
  <style>${ESTILOS}</style>
</head>
<body>
  <div class="header">
    <h1>INFORME DE STOCK</h1>
    <p>Fecha: ${new Date().toLocaleDateString('es-AR')}</p>
  </div>

  <table>
    <thead>
      <tr><th>Código</th><th>Producto</th><th>Stock</th><th>Costo unit.</th><th>Valor a costo</th><th>Precio lista</th><th>Valor a lista</th></tr>
    </thead>
    <tbody>
      ${filas}
      <tr class="total-row">
        <td colspan="4">TOTAL INVENTARIO</td>
        <td>${money(valorCosto)}</td>
        <td></td>
        <td>${money(valorLista)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer"><p>Generado automáticamente por el Sistema de Gestión</p></div>
</body>
</html>
  `;
}
