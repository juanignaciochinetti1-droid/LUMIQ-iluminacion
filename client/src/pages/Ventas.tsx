import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, FileText } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const ENTREGA_LABELS: Record<string, string> = {
  retiro_local: 'Retiro en el local',
  mercado_libre: 'Mercado Libre',
  envio: 'Envío',
};

export default function Ventas() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    remito: '',
    dniCuit: '',
    direccion: '',
    localidad: '',
    entrega: '',
    productoId: '',
    cantidad: '',
    precioUnitario: '',
  });

  const { data: ventas, refetch } = trpc.ventas.list.useQuery();
  const { data: productos } = trpc.productos.list.useQuery();
  const createMutation = trpc.ventas.create.useMutation();
  const deleteMutation = trpc.ventas.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cantidad = parseFloat(formData.cantidad);
    const precioUnitario = parseFloat(formData.precioUnitario);
    const total = cantidad * precioUnitario;

    try {
      await createMutation.mutateAsync({
        fecha: formData.fecha,
        remito: formData.remito,
        dniCuit: formData.dniCuit,
        direccion: formData.direccion,
        localidad: formData.localidad,
        entrega: formData.entrega ? (formData.entrega as 'retiro_local' | 'mercado_libre' | 'envio') : undefined,
        productoId: parseInt(formData.productoId),
        cantidad,
        precioUnitario,
        total,
      });
      toast.success('Venta registrada. Stock descontado automáticamente.');
      setOpen(false);
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        remito: '',
        dniCuit: '',
        direccion: '',
        localidad: '',
        entrega: '',
        productoId: '',
        cantidad: '',
        precioUnitario: '',
      });
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Error al registrar venta');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar esta venta? El stock del producto será restaurado.')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Venta eliminada');
        refetch();
      } catch (error: any) {
        toast.error(error?.message || 'Error al eliminar');
      }
    }
  };

  const handleGenerarPDF = (venta: any) => {
    const producto = productos?.find(p => p.id === venta.productoId);
    const html = `
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
    <div class="row"><span class="label">Modo de Entrega:</span> <span>${venta.entrega ? ENTREGA_LABELS[venta.entrega] : '-'}</span></div>
  </div>
  <div class="section">
    <h2>DETALLE DE VENTA</h2>
    <table>
      <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead>
      <tbody>
        <tr>
          <td>${producto?.nombre || 'Producto'}</td>
          <td>${parseFloat(venta.cantidad?.toString() || '0').toFixed(3)}</td>
          <td>$${parseFloat(venta.precioUnitario?.toString() || '0').toFixed(2)}</td>
          <td>$${parseFloat(venta.total?.toString() || '0').toFixed(2)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="total">TOTAL: $${parseFloat(venta.total?.toString() || '0').toFixed(2)}</div>
  <div class="section">
    <div class="row"><span class="label">Fecha:</span> <span>${new Date(venta.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</span></div>
  </div>
  <div class="footer"><p>Generado automáticamente por el Sistema de Gestión</p></div>
</body>
</html>
    `;
    const blob = new Blob([html], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `venta-${venta.remito || venta.id}.html`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Comprobante generado');
  };

  const getProductoNombre = (id: number) => productos?.find(p => p.id === id)?.nombre || `Producto ${id}`;
  const getProductoPrecio = (id: number) => parseFloat(productos?.find(p => p.id === id)?.precioVenta?.toString() || '0');

  const cantidad = parseFloat(formData.cantidad || '0');
  const precioUnitario = parseFloat(formData.precioUnitario || '0');
  const total = cantidad * precioUnitario;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ventas</h1>
          <p className="text-gray-600">Registra las ventas de productos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => {
              setFormData({
                fecha: new Date().toISOString().split('T')[0],
                remito: '',
                dniCuit: '',
                direccion: '',
                localidad: '',
                entrega: '',
                productoId: '',
                cantidad: '',
                precioUnitario: '',
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Venta
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Venta</DialogTitle>
              <DialogDescription>
                El stock se descontará automáticamente
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Fecha</label>
                  <Input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Remito</label>
                  <Input
                    placeholder="Número de remito"
                    value={formData.remito}
                    onChange={(e) => setFormData({ ...formData, remito: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">DNI/CUIT</label>
                  <Input
                    placeholder="DNI o CUIT del cliente"
                    value={formData.dniCuit}
                    onChange={(e) => setFormData({ ...formData, dniCuit: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Localidad</label>
                  <Input
                    placeholder="Localidad"
                    value={formData.localidad}
                    onChange={(e) => setFormData({ ...formData, localidad: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Dirección</label>
                <Input
                  placeholder="Dirección de entrega"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Modo de Entrega</label>
                <Select value={formData.entrega} onValueChange={(v) => setFormData({ ...formData, entrega: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar modo de entrega" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retiro_local">Retiro en el local</SelectItem>
                    <SelectItem value="mercado_libre">Mercado Libre</SelectItem>
                    <SelectItem value="envio">Envío</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Producto</label>
                <Select value={formData.productoId} onValueChange={(v) => {
                  setFormData({ ...formData, productoId: v, precioUnitario: getProductoPrecio(parseInt(v)).toString() });
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productos?.map(p => (
                      <SelectItem key={p.id} value={p.id?.toString() || ''}>
                        {p.nombre} - ${parseFloat(p.precioVenta?.toString() || '0').toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Cantidad</label>
                  <Input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={formData.cantidad}
                    onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Precio Unitario</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.precioUnitario}
                    onChange={(e) => setFormData({ ...formData, precioUnitario: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Total */}
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Total:</span>
                    <span className="text-2xl font-bold text-orange-600">${total.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                Registrar Venta
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabla de histórico */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50 hover:bg-orange-50">
                <TableHead>Fecha</TableHead>
                <TableHead>Remito</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio Unit.</TableHead>
                <TableHead>Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ventas?.map((v) => (
                <TableRow key={v.id} className="hover:bg-orange-50/50">
                  <TableCell>{new Date(v.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</TableCell>
                  <TableCell className="font-medium">{v.remito || '-'}</TableCell>
                  <TableCell className="text-sm">
                    <div>{v.dniCuit || '-'}</div>
                    <div className="text-gray-500">{v.localidad || '-'}</div>
                  </TableCell>
                  <TableCell className="text-sm">{v.entrega ? ENTREGA_LABELS[v.entrega] : '-'}</TableCell>
                  <TableCell className="text-orange-600 font-medium">{getProductoNombre(v.productoId)}</TableCell>
                  <TableCell>{parseFloat(v.cantidad?.toString() || '0').toFixed(3)}</TableCell>
                  <TableCell>${parseFloat(v.precioUnitario?.toString() || '0').toFixed(2)}</TableCell>
                  <TableCell className="font-bold text-orange-600">${parseFloat(v.total?.toString() || '0').toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerarPDF(v)}
                      className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                      title="Generar PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(v.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(!ventas || ventas.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No hay ventas registradas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
