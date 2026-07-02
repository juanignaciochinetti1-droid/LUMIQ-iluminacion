import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

export default function Insumos() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    cantidad: '',
    unidad: '',
    precioUnitario: '',
  });

  const { data: insumos, refetch } = trpc.insumos.list.useQuery();
  const createMutation = trpc.insumos.create.useMutation();
  const updateMutation = trpc.insumos.update.useMutation();
  const deleteMutation = trpc.insumos.delete.useMutation();

  const filteredInsumos = insumos?.filter(i =>
    i.codigo?.toLowerCase().includes(search.toLowerCase()) ||
    i.descripcion?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          codigo: formData.codigo,
          descripcion: formData.descripcion,
          cantidad: parseFloat(formData.cantidad),
          unidad: formData.unidad,
          precioUnitario: parseFloat(formData.precioUnitario),
        });
        toast.success('Insumo actualizado');
      } else {
        await createMutation.mutateAsync({
          codigo: formData.codigo,
          descripcion: formData.descripcion,
          cantidad: parseFloat(formData.cantidad),
          unidad: formData.unidad,
          precioUnitario: parseFloat(formData.precioUnitario),
        });
        toast.success('Insumo creado');
      }
      setOpen(false);
      setFormData({ codigo: '', descripcion: '', cantidad: '', unidad: '', precioUnitario: '' });
      setEditingId(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Error al guardar');
    }
  };

  const handleEdit = (insumo: any) => {
    setEditingId(insumo.id);
    setFormData({
      codigo: insumo.codigo,
      descripcion: insumo.descripcion,
      cantidad: insumo.cantidad?.toString() || '',
      unidad: insumo.unidad,
      precioUnitario: insumo.precioUnitario?.toString() || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este insumo?')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Insumo eliminado');
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
          <h1 className="text-3xl font-bold text-gray-900">Insumos</h1>
          <p className="text-gray-600">Gestiona tu inventario de insumos</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => {
              setEditingId(null);
              setFormData({ codigo: '', descripcion: '', cantidad: '', unidad: '', precioUnitario: '' });
            }}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Insumo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Nuevo'} Insumo</DialogTitle>
              <DialogDescription>
                {editingId ? 'Modifica los datos del insumo' : 'Ingresa los datos del nuevo insumo'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                placeholder="Código"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                required
              />
              <Input
                placeholder="Descripción"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                required
              />
              <Input
                placeholder="Cantidad"
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
              <Input
                placeholder="Precio Unitario"
                type="number"
                step="0.01"
                value={formData.precioUnitario}
                onChange={(e) => setFormData({ ...formData, precioUnitario: e.target.value })}
                required
              />
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                {editingId ? 'Actualizar' : 'Crear'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Búsqueda */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por código o descripción..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0"
            />
          </div>
        </CardHeader>
      </Card>

      {/* Tabla */}
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-50 hover:bg-orange-50">
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead>Precio Unit.</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInsumos.map((insumo) => (
                <TableRow key={insumo.id} className="hover:bg-orange-50/50">
                  <TableCell className="font-medium text-orange-600">{insumo.codigo}</TableCell>
                  <TableCell>{insumo.descripcion}</TableCell>
                  <TableCell>{parseFloat(insumo.cantidad?.toString() || '0').toFixed(3)}</TableCell>
                  <TableCell>{insumo.unidad}</TableCell>
                  <TableCell>${parseFloat(insumo.precioUnitario?.toString() || '0').toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(insumo)}
                      className="text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(insumo.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredInsumos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No hay insumos registrados
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
