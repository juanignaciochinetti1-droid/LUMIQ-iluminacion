import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit2, Trash2, Search, AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Productos() {
  const [search, setSearch] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    stock: '',
    precioVenta: '',
  });

  const { data: productos, refetch } = trpc.productos.list.useQuery();
  const createMutation = trpc.productos.create.useMutation();
  const updateMutation = trpc.productos.update.useMutation();
  const deleteMutation = trpc.productos.delete.useMutation();

  const filteredProductos = productos?.filter(p =>
    p.nombre?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const stockBajo = filteredProductos.filter(p => parseFloat(p.stock?.toString() || '0') < 10);

  const productosTabla = soloStockBajo ? stockBajo : filteredProductos;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          nombre: formData.nombre,
          stock: parseFloat(formData.stock),
          precioVenta: parseFloat(formData.precioVenta),
        });
        toast.success('Producto actualizado');
      } else {
        await createMutation.mutateAsync({
          nombre: formData.nombre,
          stock: parseFloat(formData.stock),
          precioVenta: parseFloat(formData.precioVenta),
        });
        toast.success('Producto creado');
      }
      setOpen(false);
      setFormData({ nombre: '', stock: '', precioVenta: '' });
      setEditingId(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Error al guardar');
    }
  };

  const handleEdit = (producto: any) => {
    setEditingId(producto.id);
    setFormData({
      nombre: producto.nombre,
      stock: producto.stock?.toString() || '',
      precioVenta: producto.precioVenta?.toString() || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este producto?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Producto eliminado');
        refetch();
      } catch (error: any) {
        toast.error(error?.message || 'Error al eliminar');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600">Gestiona tu catálogo de productos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => {
              setEditingId(null);
              setFormData({ nombre: '', stock: '', precioVenta: '' });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Nuevo'} Producto</DialogTitle>
              <DialogDescription>
                {editingId ? 'Modifica los datos del producto' : 'Ingresa los datos del nuevo producto'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Nombre del producto"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                required
              />
              <Input
                placeholder="Stock inicial"
                type="number"
                step="0.001"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                required
              />
              <Input
                placeholder="Precio de venta"
                type="number"
                step="0.01"
                value={formData.precioVenta}
                onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })}
                required
              />
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                {editingId ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alertas de stock bajo */}
      {stockBajo.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Productos con Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {stockBajo.map((p) => (
                <div key={p.id} className="bg-white p-2 rounded border border-orange-200">
                  <div className="font-semibold text-orange-700">{p.nombre}</div>
                  <div className="text-sm text-orange-600">Stock: {parseFloat(p.stock?.toString() || '0').toFixed(2)}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Búsqueda */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar producto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer w-fit">
            <Checkbox
              checked={soloStockBajo}
              onCheckedChange={(checked) => setSoloStockBajo(checked === true)}
            />
            Solo stock bajo
          </label>
        </CardHeader>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-orange-50 hover:bg-orange-50">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Precio Venta</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosTabla.map((producto) => {
                  const stock = parseFloat(producto.stock?.toString() || '0');
                  const precio = parseFloat(producto.precioVenta?.toString() || '0');
                  const valorTotal = stock * precio;
                  const isLowStock = stock < 10;

                  return (
                    <TableRow key={producto.id} className={`hover:bg-orange-50/50 ${isLowStock ? 'bg-orange-50' : ''}`}>
                      <TableCell className="font-medium text-orange-600">{producto.nombre}</TableCell>
                      <TableCell className={isLowStock ? 'text-red-600 font-semibold' : ''}>
                        {stock.toFixed(2)}
                      </TableCell>
                      <TableCell>${precio.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold text-orange-600">${valorTotal.toFixed(2)}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(producto)}
                          className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(producto.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {productosTabla.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {soloStockBajo ? 'No hay productos con stock bajo' : 'No hay productos registrados'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
