import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Produccion() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    productoId: '',
    cantidad: '',
    responsable: '',
    costoMP: '',
  });

  const { data: produccion, refetch } = trpc.produccion.list.useQuery();
  const { data: productos } = trpc.productos.list.useQuery();
  const { data: recetas } = trpc.recetas.list.useQuery();
  const { data: insumos } = trpc.insumos.list.useQuery();
  const createMutation = trpc.produccion.create.useMutation();
  const deleteMutation = trpc.produccion.delete.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        fecha: formData.fecha,
        productoId: parseInt(formData.productoId),
        cantidad: parseFloat(formData.cantidad),
        responsable: formData.responsable,
        costoMP: parseFloat(formData.costoMP || '0'),
      });
      toast.success('Producción registrada. Insumos descontados automáticamente.');
      setOpen(false);
      setFormData({
        fecha: new Date().toISOString().split('T')[0],
        productoId: '',
        cantidad: '',
        responsable: '',
        costoMP: '',
      });
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Error al registrar producción');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este registro? El stock del producto será revertido. Los insumos no se restauran.')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Producción eliminada');
        refetch();
      } catch (error: any) {
        toast.error(error?.message || 'Error al eliminar');
      }
    }
  };

  const getProductoNombre = (id: number) => productos?.find(p => p.id === id)?.nombre || `Producto ${id}`;
  const getRecetasProducto = (productoId: number) => recetas?.filter(r => r.productoId === productoId) || [];
  const getInsumoNombre = (id: number) => insumos?.find(i => i.id === id)?.descripcion || `Insumo ${id}`;
  const getInsumoUnidad = (id: number) => insumos?.find(i => i.id === id)?.unidad || '';

  const recetasSeleccionadas = formData.productoId ? getRecetasProducto(parseInt(formData.productoId)) : [];
  const cantidadProduccion = parseFloat(formData.cantidad || '0');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Producción</h1>
          <p className="text-gray-600">Registra la producción de productos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => {
              setFormData({
                fecha: new Date().toISOString().split('T')[0],
                productoId: '',
                cantidad: '',
                responsable: '',
                costoMP: '',
              });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Producción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Registrar Producción</DialogTitle>
              <DialogDescription>
                Los insumos se descontarán automáticamente según la receta del producto
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
                  <label className="text-sm font-medium">Responsable</label>
                  <Input
                    placeholder="Nombre del responsable"
                    value={formData.responsable}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Producto</label>
                <Select value={formData.productoId} onValueChange={(v) => setFormData({ ...formData, productoId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar producto" />
                  </SelectTrigger>
                  <SelectContent>
                    {productos?.map(p => (
                      <SelectItem key={p.id} value={p.id?.toString() || ''}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Cantidad a Producir</label>
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
                  <label className="text-sm font-medium">Costo MP</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.costoMP}
                    onChange={(e) => setFormData({ ...formData, costoMP: e.target.value })}
                  />
                </div>
              </div>

              {/* Preview de insumos a descontar */}
              {recetasSeleccionadas.length > 0 && cantidadProduccion > 0 && (
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Insumos a Descontar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {recetasSeleccionadas.map((r) => {
                        const cantidadDescontar = parseFloat(r.cantidad?.toString() || '0') * cantidadProduccion;
                        return (
                          <div key={r.id} className="flex justify-between">
                            <span>{getInsumoNombre(r.insumoId)}</span>
                            <span className="font-semibold text-blue-600">
                              -{cantidadDescontar.toFixed(3)} {getInsumoUnidad(r.insumoId)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                Registrar Producción
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
                <TableHead>Producto</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Costo MP</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {produccion?.map((p) => (
                <TableRow key={p.id} className="hover:bg-orange-50/50">
                  <TableCell>{new Date(p.fecha + 'T00:00:00').toLocaleDateString('es-AR')}</TableCell>
                  <TableCell className="font-medium text-orange-600">{getProductoNombre(p.productoId)}</TableCell>
                  <TableCell>{parseFloat(p.cantidad?.toString() || '0').toFixed(3)}</TableCell>
                  <TableCell>{p.responsable}</TableCell>
                  <TableCell>${parseFloat(p.costoMP?.toString() || '0').toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(!produccion || produccion.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              No hay registros de producción
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
