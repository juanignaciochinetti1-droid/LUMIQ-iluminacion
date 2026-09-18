import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit2, Printer } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { SearchSelect } from '@/components/SearchSelect';
import { htmlListadoProduccion, printHtml } from '@/lib/print';
import { fechaAR, hoy, money, qty, toNum } from '@/lib/format';

const formVacio = () => ({
  fecha: hoy(),
  productoId: '',
  cantidad: '',
  responsable: '',
  costoMP: '',
});

export default function Produccion() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [formData, setFormData] = useState(formVacio);

  const utils = trpc.useUtils();
  const { data: produccion } = trpc.produccion.list.useQuery();
  const { data: productos = [] } = trpc.productos.list.useQuery();
  const { data: recetas } = trpc.recetas.list.useQuery();
  const createMutation = trpc.produccion.create.useMutation();
  const updateMutation = trpc.produccion.update.useMutation();
  const deleteMutation = trpc.produccion.delete.useMutation();

  // Producir cambia el stock de varios productos: se refresca todo lo que lo muestra.
  const refrescar = () => Promise.all([
    utils.produccion.list.invalidate(),
    utils.productos.list.invalidate(),
    utils.dashboard.invalidate(),
  ]);

  const abrirNueva = () => {
    setEditingId(null);
    setFormData(formVacio());
    setOpen(true);
  };

  const abrirEditar = (p: NonNullable<typeof produccion>[number]) => {
    setEditingId(p.id);
    setFormData({
      fecha: p.fecha,
      productoId: String(p.productoId),
      cantidad: String(parseFloat(p.cantidad)),
      responsable: p.responsable,
      costoMP: parseFloat(p.costoMP ?? '0') ? String(parseFloat(p.costoMP ?? '0')) : '',
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productoId) { toast.error('Seleccioná un producto'); return; }
    const datos = {
      fecha: formData.fecha,
      productoId: parseInt(formData.productoId),
      cantidad: parseFloat(formData.cantidad),
      responsable: formData.responsable,
      costoMP: parseFloat(formData.costoMP || '0'),
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...datos });
        toast.success('Producción actualizada. Stock e insumos recalculados.');
      } else {
        await createMutation.mutateAsync(datos);
        toast.success('Producción registrada. Insumos descontados automáticamente.');
      }
      setOpen(false);
      await refrescar();
    } catch (error: any) {
      toast.error(error?.message || 'Error al guardar la producción');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este registro? Se quitará el stock producido y se devolverán los insumos utilizados.')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Producción eliminada');
        await refrescar();
      } catch (error: any) {
        toast.error(error?.message || 'Error al eliminar');
      }
    }
  };

  const getProductoNombre = (id: number) => productos.find(p => p.id === id)?.nombre || `Producto ${id}`;
  const getProducto = (id: number) => productos.find(p => p.id === id);

  const recetasSeleccionadas = formData.productoId ? (recetas?.filter(r => r.productoId === parseInt(formData.productoId)) || []) : [];
  const cantidadProduccion = toNum(formData.cantidad);

  const filtrada = useMemo(() => {
    // Más reciente primero
    return [...(produccion || [])]
      .filter(p => (!fechaDesde || p.fecha >= fechaDesde) && (!fechaHasta || p.fecha <= fechaHasta))
      .sort((a, b) => (a.fecha === b.fecha ? b.id - a.id : b.fecha.localeCompare(a.fecha)));
  }, [produccion, fechaDesde, fechaHasta]);

  const imprimir = () => {
    if (filtrada.length === 0) { toast.error('No hay producción para imprimir'); return; }
    const filtros = [fechaDesde && `desde ${fechaAR(fechaDesde)}`, fechaHasta && `hasta ${fechaAR(fechaHasta)}`].filter(Boolean).join(' · ');
    printHtml(htmlListadoProduccion(filtrada, productos, filtros));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Producción</h1>
          <p className="text-gray-600">Registra la producción de productos</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={imprimir}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir producción
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700" onClick={abrirNueva}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Producción
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Registrar'} Producción</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Al guardar se revierte la producción original y se aplica con los datos nuevos'
                : 'Los insumos se descontarán automáticamente según la receta del producto'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Fecha</label>
                <Input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Responsable</label>
                <Input placeholder="Nombre del responsable" value={formData.responsable} onChange={(e) => setFormData({ ...formData, responsable: e.target.value })} required />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Producto</label>
              <SearchSelect
                value={formData.productoId}
                onChange={(v) => setFormData({ ...formData, productoId: v })}
                placeholder="Seleccionar producto"
                options={productos.map(p => ({
                  value: String(p.id),
                  label: p.nombre,
                  search: `${p.codigo ?? ''} ${p.codigoProveedor ?? ''}`,
                  hint: p.codigo ?? undefined,
                }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Cantidad a Producir</label>
                <Input type="number" step="0.001" min="0.001" placeholder="0.000" value={formData.cantidad} onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Costo MP</label>
                <Input type="number" step="0.01" placeholder="0.00" value={formData.costoMP} onChange={(e) => setFormData({ ...formData, costoMP: e.target.value })} />
              </div>
            </div>

            {/* Preview de insumos a descontar */}
            {recetasSeleccionadas.length > 0 && cantidadProduccion > 0 && (
              <Card className="bg-blue-50 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Insumos a Descontar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                    {recetasSeleccionadas.map((r) => (
                      <div key={r.id} className="flex justify-between">
                        <span>{getProductoNombre(r.insumoId)}</span>
                        <span className="font-semibold text-blue-600">
                          -{qty(toNum(r.cantidad) * cantidadProduccion)} {getProducto(r.insumoId)?.unidad ?? r.unidad}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Guardar cambios' : 'Registrar Producción'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <label className="text-xs font-medium text-gray-500">Desde</label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Hasta</label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Tabla de histórico */}
      <Card>
        <CardContent className="pt-6">
          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-orange-50 hover:bg-orange-50">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Cantidad</TableHead>
                  <TableHead>Responsable</TableHead>
                  <TableHead>Costo MP</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrada.map((p) => (
                  <TableRow key={p.id} className="hover:bg-orange-50/50">
                    <TableCell>{fechaAR(p.fecha)}</TableCell>
                    <TableCell className="font-medium text-orange-600">{getProductoNombre(p.productoId)}</TableCell>
                    <TableCell>{qty(p.cantidad)}</TableCell>
                    <TableCell>{p.responsable}</TableCell>
                    <TableCell>{money(p.costoMP)}</TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirEditar(p)}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(p.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtrada.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {produccion && produccion.length > 0 ? 'Ningún registro coincide con las fechas' : 'No hay registros de producción'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
