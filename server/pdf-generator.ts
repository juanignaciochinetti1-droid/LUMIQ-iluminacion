/**
 * Generadores de HTML para PDFs
 * Estos generan HTML que puede ser convertido a PDF en el cliente
 */

export function generarHTMLVenta(venta: any, producto: any) {
  const fecha = new Date(venta.fecha).toLocaleDateString('es-AR');
  const total = parseFloat(venta.total?.toString() || '0').toFixed(2);
  const cantidad = parseFloat(venta.cantidad?.toString() || '0').toFixed(3);
  const precioUnitario = parseFloat(venta.precioUnitario?.toString() || '0').toFixed(2);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Comprobante de Venta</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #ff8c42; margin: 0; }
    .section { margin-bottom: 20px; }
    .section h2 { color: #ff8c42; font-size: 14px; border-bottom: 2px solid #ff8c42; padding-bottom: 5px; }
    .row { display: flex; justify-content: space-between; padding: 5px 0; }
    .label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th { background-color: #ff8c42; color: white; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    .total { font-size: 18px; font-weight: bold; color: #ff8c42; text-align: right; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>COMPROBANTE DE VENTA</h1>
    <p>Remito: ${venta.remito || 'S/N'}</p>
  </div>

  <div class="section">
    <h2>DATOS DEL CLIENTE</h2>
    <div class="row"><span class="label">DNI/CUIT:</span> <span>${venta.dniCuit || '-'}</span></div>
    <div class="row"><span class="label">Localidad:</span> <span>${venta.localidad || '-'}</span></div>
    <div class="row"><span class="label">Dirección:</span> <span>${venta.direccion || '-'}</span></div>
  </div>

  <div class="section">
    <h2>DETALLE DE VENTA</h2>
    <table>
      <thead>
        <tr>
          <th>Producto</th>
          <th>Cantidad</th>
          <th>Precio Unit.</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${producto?.nombre || 'Producto'}</td>
          <td>${cantidad}</td>
          <td>$${precioUnitario}</td>
          <td>$${total}</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="total">TOTAL: $${total}</div>

  <div class="section">
    <div class="row"><span class="label">Fecha:</span> <span>${fecha}</span></div>
  </div>

  <div class="footer">
    <p>Generado automáticamente por el Sistema de Gestión</p>
  </div>
</body>
</html>
  `;
}

export function generarHTMLVentasMensuales(ventas: any[], productos: any[], mes: number, año: number) {
  const nombreMes = new Date(año, mes - 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const totalVentas = ventas.reduce((sum, v) => sum + parseFloat(v.total?.toString() || '0'), 0);
  const totalUnidades = ventas.reduce((sum, v) => sum + parseFloat(v.cantidad?.toString() || '0'), 0);

  const filasTabla = ventas.map(v => {
    const producto = productos.find(p => p.id === v.productoId);
    return `
      <tr>
        <td>${new Date(v.fecha).toLocaleDateString('es-AR')}</td>
        <td>${v.remito || '-'}</td>
        <td>${producto?.nombre || 'Producto'}</td>
        <td>${parseFloat(v.cantidad?.toString() || '0').toFixed(3)}</td>
        <td>$${parseFloat(v.total?.toString() || '0').toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Informe de Ventas</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #ff8c42; margin: 0; }
    .header p { margin: 5px 0; }
    .resumen { display: flex; gap: 20px; margin: 20px 0; }
    .resumen-item { flex: 1; padding: 15px; background: #fff5e6; border-left: 4px solid #ff8c42; }
    .resumen-item .label { font-size: 12px; color: #666; }
    .resumen-item .valor { font-size: 24px; font-weight: bold; color: #ff8c42; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background-color: #ff8c42; color: white; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INFORME DE VENTAS</h1>
    <p>Período: ${nombreMes}</p>
    <p>Generado: ${new Date().toLocaleDateString('es-AR')}</p>
  </div>

  <div class="resumen">
    <div class="resumen-item">
      <div class="label">Total de Ventas</div>
      <div class="valor">$${totalVentas.toFixed(2)}</div>
    </div>
    <div class="resumen-item">
      <div class="label">Unidades Vendidas</div>
      <div class="valor">${totalUnidades.toFixed(0)}</div>
    </div>
    <div class="resumen-item">
      <div class="label">Cantidad de Transacciones</div>
      <div class="valor">${ventas.length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Remito</th>
        <th>Producto</th>
        <th>Cantidad</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      ${filasTabla}
    </tbody>
  </table>

  <div class="footer">
    <p>Generado automáticamente por el Sistema de Gestión</p>
  </div>
</body>
</html>
  `;
}

export function generarHTMLStockMensual(productos: any[], insumos: any[]) {
  const filasProductos = productos.map(p => `
    <tr>
      <td>${p.nombre}</td>
      <td>${parseFloat(p.stock?.toString() || '0').toFixed(3)}</td>
      <td>$${parseFloat(p.precioVenta?.toString() || '0').toFixed(2)}</td>
      <td>$${(parseFloat(p.stock?.toString() || '0') * parseFloat(p.precioVenta?.toString() || '0')).toFixed(2)}</td>
    </tr>
  `).join('');

  const filasInsumos = insumos.map(i => `
    <tr>
      <td>${i.descripcion}</td>
      <td>${parseFloat(i.cantidad?.toString() || '0').toFixed(3)} ${i.unidad}</td>
      <td>$${parseFloat(i.precioUnitario?.toString() || '0').toFixed(2)}</td>
      <td>$${(parseFloat(i.cantidad?.toString() || '0') * parseFloat(i.precioUnitario?.toString() || '0')).toFixed(2)}</td>
    </tr>
  `).join('');

  const valorTotalProductos = productos.reduce((sum, p) => sum + (parseFloat(p.stock?.toString() || '0') * parseFloat(p.precioVenta?.toString() || '0')), 0);
  const valorTotalInsumos = insumos.reduce((sum, i) => sum + (parseFloat(i.cantidad?.toString() || '0') * parseFloat(i.precioUnitario?.toString() || '0')), 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Informe de Stock</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { color: #ff8c42; margin: 0; }
    .header p { margin: 5px 0; }
    h2 { color: #ff8c42; border-bottom: 2px solid #ff8c42; padding-bottom: 10px; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background-color: #ff8c42; color: white; padding: 10px; text-align: left; }
    td { padding: 10px; border-bottom: 1px solid #ddd; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .total-row { font-weight: bold; background-color: #fff5e6; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>INFORME DE STOCK</h1>
    <p>Fecha: ${new Date().toLocaleDateString('es-AR')}</p>
  </div>

  <h2>PRODUCTOS</h2>
  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th>Stock</th>
        <th>Precio Unit.</th>
        <th>Valor Total</th>
      </tr>
    </thead>
    <tbody>
      ${filasProductos}
      <tr class="total-row">
        <td colspan="3">TOTAL PRODUCTOS</td>
        <td>$${valorTotalProductos.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <h2>INSUMOS</h2>
  <table>
    <thead>
      <tr>
        <th>Insumo</th>
        <th>Cantidad</th>
        <th>Precio Unit.</th>
        <th>Valor Total</th>
      </tr>
    </thead>
    <tbody>
      ${filasInsumos}
      <tr class="total-row">
        <td colspan="3">TOTAL INSUMOS</td>
        <td>$${valorTotalInsumos.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>

  <div class="total-row" style="padding: 15px; text-align: right; font-size: 18px;">
    VALOR TOTAL DEL INVENTARIO: $${(valorTotalProductos + valorTotalInsumos).toFixed(2)}
  </div>

  <div class="footer">
    <p>Generado automáticamente por el Sistema de Gestión</p>
  </div>
</body>
</html>
  `;
}
