import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Recetas() {
  const [search, setSearch] = useState('');
  const [filterProducto, setFilterProducto] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    productoId: '',
    insumoId: '',
    cantidad: '',
    unidad: '',
  });

  const { data: recetas, refetch } = trpc.recetas.list.useQuery();
  const { data: productos } = trpc.productos.list.useQuery();
  const { data: insumos } = trpc.insumos.list.useQuery();
  const createMutation = trpc.recetas.create.useMutation();
  const updateMutation = trpc.recetas.update.useMutation();
  const deleteMutation = trpc.recetas.delete.useMutation();

  const filteredRecetas = recetas?.filter(r => {
    const matchProducto = filterProducto === 'all' || r.productoId?.toString() === filterProducto;
    return matchProducto;
  }) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          productoId: parseInt(formData.productoId),
          insumoId: parseInt(formData.insumoId),
          cantidad: parseFloat(formData.cantidad),
          unidad: formData.unidad,
        });
        toast.success('Receta actualizada');
      } else {
        await createMutation.mutateAsync({
          productoId: parseInt(formData.productoId),
          insumoId: parseInt(formData.insumoId),
          cantidad: parseFloat(formData.cantidad),
          unidad: formData.unidad,
        });
        toast.success('Receta creada');
      }
      setOpen(false);
      setFormData({ productoId: '', insumoId: '', cantidad: '', unidad: '' });
      setEditingId(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Error al guardar');
    }
  };

  const handleEdit = (receta: any) => {
    setEditingId(receta.id);
    setFormData({
      productoId: receta.productoId?.toString() || '',
      insumoId: receta.insumoId?.toString() || '',
      cantidad: receta.cantidad?.toString() || '',
      unidad: receta.unidad || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar esta receta?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Receta eliminada');
        refetch();
      } catch (error: any) {
        toast.error(error?.message || 'Error al eliminar');
      }
    }
  };

  const getProductoNombre = (id: number) => productos?.find(p => p.id === id)?.nombre || `Producto ${id}`;
  const getInsumoNombre = (id: number) => insumos?.find(i => i.id === id)?.descripcion || `Insumo ${id}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
          <p className="text-gray-600">Define los insumos necesarios para cada producto</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => {
              setEditingId(null);
              setFormData({ productoId: '', insumoId: '', cantidad: '', unidad: '' });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Receta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Nueva'} Receta</DialogTitle>
              <DialogDescription>
                Asocia un insumo a un producto con la cantidad necesaria por unidad producida
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
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

              <Select value={formData.insumoId} onValueChange={(v) => setFormData({ ...formData, insumoId: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar insumo" />
                </SelectTrigger>
                <SelectContent>
                  {insumos?.map(i => (
                    <SelectItem key={i.id} value={i.id?.toString() || ''}>
                      {i.descripcion}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Cantidad necesaria"
                type="number"
                step="0.001"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                required
              />

              <Input
                placeholder="Unidad (kg, L, etc)"
                value={formData.unidad}
                onChange={(e) => setFormData({ ...formData, unidad: e.target.value })}
                required
              />

              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                {editingId ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Select value={filterProducto} onValueChange={setFilterProducto}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filtrar por producto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los productos</SelectItem>
                {productos?.map(p => (
                  <SelectItem key={p.id} value={p.id?.toString() || ''}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50 hover:bg-orange-50">
                <TableHead>Producto</TableHead>
                <TableHead>Insumo</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecetas.map((receta) => (
                <TableRow key={receta.id} className="hover:bg-orange-50/50">
                  <TableCell className="font-medium text-orange-600">{getProductoNombre(receta.productoId)}</TableCell>
                  <TableCell>{getInsumoNombre(receta.insumoId)}</TableCell>
                  <TableCell>{parseFloat(receta.cantidad?.toString() || '0').toFixed(3)}</TableCell>
                  <TableCell>{receta.unidad}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(receta)}
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(receta.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredRecetas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay recetas registradas
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
