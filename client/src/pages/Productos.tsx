import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit2, Trash2, Search, AlertTriangle } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { money, qty } from '@/lib/format';
import { precioContado, toNum } from '@shared/pricing';

const formVacio = {
  codigo: '',
  codigoProveedor: '',
  nombre: '',
  unidad: 'u',
  stock: '',
  costo: '',
  precioVenta: '',
  descuentoContado: '',
};

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1 block">{label}</label>
      {children}
    </div>
  );
}

export default function Productos() {
  const [search, setSearch] = useState('');
  const [soloStockBajo, setSoloStockBajo] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState(formVacio);

  const { data: productos, refetch } = trpc.productos.list.useQuery();
  const createMutation = trpc.productos.create.useMutation();
  const updateMutation = trpc.productos.update.useMutation();
  const deleteMutation = trpc.productos.delete.useMutation();

  const term = search.trim().toLowerCase();
  const filteredProductos = productos?.filter(p =>
    !term ||
    p.nombre?.toLowerCase().includes(term) ||
    p.codigo?.toLowerCase().includes(term) ||
    p.codigoProveedor?.toLowerCase().includes(term)
  ) || [];

  const stockBajo = filteredProductos.filter(p => toNum(p.stock) < 10);
  const productosTabla = soloStockBajo ? stockBajo : filteredProductos;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const datos = {
      codigo: formData.codigo,
      codigoProveedor: formData.codigoProveedor,
      nombre: formData.nombre,
      unidad: formData.unidad || 'u',
      stock: toNum(formData.stock),
      costo: toNum(formData.costo),
      precioVenta: toNum(formData.precioVenta),
      descuentoContado: toNum(formData.descuentoContado),
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...datos });
        toast.success('Producto actualizado');
      } else {
        await createMutation.mutateAsync(datos);
        toast.success('Producto creado');
      }
      setOpen(false);
      setFormData(formVacio);
      setEditingId(null);
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Error al guardar');
    }
  };

  const handleEdit = (producto: NonNullable<typeof productos>[number]) => {
    setEditingId(producto.id);
    setFormData({
      codigo: producto.codigo ?? '',
      codigoProveedor: producto.codigoProveedor ?? '',
      nombre: producto.nombre,
      unidad: producto.unidad,
      stock: producto.stock?.toString() || '',
      costo: producto.costo?.toString() || '',
      precioVenta: producto.precioVenta?.toString() || '',
      descuentoContado: producto.descuentoContado?.toString() || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Está seguro de eliminar este producto? También se elimina su receta.')) {
      try {
        await deleteMutation.mutateAsync(id);
        toast.success('Producto eliminado');
        refetch();
      } catch (error: any) {
        toast.error(error?.message || 'Error al eliminar');
      }
    }
  };

  const contadoPreview = precioContado(formData.precioVenta, formData.descuentoContado);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Productos</h1>
          <p className="text-gray-600">Catálogo unificado: productos terminados, insumos y materias primas</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={() => {
          setEditingId(null);
          setFormData(formVacio);
          setOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Producto
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Nuevo'} Producto</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modifica los datos del producto' : 'Ingresa los datos del nuevo producto'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Campo label="Código interno">
                <Input placeholder="Ej: LAM-001" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} />
              </Campo>
              <Campo label="Código proveedor">
                <Input placeholder="Código del proveedor" value={formData.codigoProveedor} onChange={(e) => setFormData({ ...formData, codigoProveedor: e.target.value })} />
              </Campo>
            </div>
            <Campo label="Nombre / descripción">
              <Input placeholder="Nombre del producto" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} required />
            </Campo>
            <div className="grid grid-cols-3 gap-4">
              <Campo label="Unidad">
                <Input placeholder="u, kg, m, L..." value={formData.unidad} onChange={(e) => setFormData({ ...formData, unidad: e.target.value })} required />
              </Campo>
              <Campo label="Stock">
                <Input type="number" step="0.001" placeholder="0" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: e.target.value })} required />
              </Campo>
              <Campo label="Costo unitario">
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={formData.costo} onChange={(e) => setFormData({ ...formData, costo: e.target.value })} />
              </Campo>
            </div>
            <div className="grid grid-cols-3 gap-4 items-end">
              <Campo label="Precio de lista">
                <Input type="number" step="0.01" min="0" placeholder="0.00" value={formData.precioVenta} onChange={(e) => setFormData({ ...formData, precioVenta: e.target.value })} required />
              </Campo>
              <Campo label="Descuento contado (%)">
                <Input type="number" step="0.1" min="0" max="100" placeholder="0" value={formData.descuentoContado} onChange={(e) => setFormData({ ...formData, descuentoContado: e.target.value })} />
              </Campo>
              <div className="rounded-md bg-orange-50 border border-orange-200 px-3 py-2">
                <div className="text-xs text-gray-600">Precio de contado</div>
                <div className="font-bold text-orange-600">{money(contadoPreview)}</div>
              </div>
            </div>
            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
              {editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Alertas de stock bajo */}
      {stockBajo.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Stock bajo ({stockBajo.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {stockBajo.map((p) => (
                <div key={p.id} className="bg-white p-2 rounded border border-orange-200">
                  <div className="font-semibold text-orange-700">{p.nombre}</div>
                  <div className="text-sm text-orange-600">Stock: {qty(p.stock)} {p.unidad}</div>
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
              placeholder="Buscar por nombre, código interno o código de proveedor..."
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
                  <TableHead>Cód. interno</TableHead>
                  <TableHead>Cód. proveedor</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Costo</TableHead>
                  <TableHead>P. Lista</TableHead>
                  <TableHead>Desc. contado</TableHead>
                  <TableHead>P. Contado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productosTabla.map((producto) => {
                  const stock = toNum(producto.stock);
                  const isLowStock = stock < 10;
                  const descuento = toNum(producto.descuentoContado);

                  return (
                    <TableRow key={producto.id} className={`hover:bg-orange-50/50 ${isLowStock ? 'bg-orange-50' : ''}`}>
                      <TableCell className="font-mono text-xs">{producto.codigo || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{producto.codigoProveedor || '-'}</TableCell>
                      <TableCell className="font-medium text-orange-600">{producto.nombre}</TableCell>
                      <TableCell className={isLowStock ? 'text-red-600 font-semibold' : ''}>
                        {qty(stock)} <span className="text-gray-400 text-xs">{producto.unidad}</span>
                      </TableCell>
                      <TableCell>{money(producto.costo)}</TableCell>
                      <TableCell>{money(producto.precioVenta)}</TableCell>
                      <TableCell>{descuento ? `${qty(descuento)}%` : '-'}</TableCell>
                      <TableCell className="font-semibold text-orange-600">{money(precioContado(producto.precioVenta, descuento))}</TableCell>
                      <TableCell className="text-right space-x-2 whitespace-nowrap">
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
