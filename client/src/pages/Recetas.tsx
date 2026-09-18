import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, AlertCircle, FlaskConical, PackagePlus, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { SearchSelect } from '@/components/SearchSelect';
import { qty, toNum } from '@/lib/format';

const emptyNuevoComponente = { codigo: '', nombre: '', unidad: '', stock: '0', costo: '0' };
const emptyNuevoProducto = { nombre: '', stock: '0', precioVenta: '0' };
const emptyComponente = { insumoId: '', cantidad: '', unidad: '' };

export default function Recetas() {
  const [selectedProductoId, setSelectedProductoId] = useState<string>('');
  const [cantidadProducir, setCantidadProducir] = useState<string>('1');

  // Dialog agregar / editar componente
  const [open, setOpen] = useState(false);
  const [editingRecetaId, setEditingRecetaId] = useState<number | null>(null);
  const [formData, setFormData] = useState(emptyComponente);

  // Inline: crear un componente nuevo dentro del dialog (se guarda como producto)
  const [showNuevoComponente, setShowNuevoComponente] = useState(false);
  const [nuevoComponente, setNuevoComponente] = useState(emptyNuevoComponente);

  // Inline: crear nuevo producto en el selector principal
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState(emptyNuevoProducto);

  const { data: recetas, refetch } = trpc.recetas.list.useQuery();
  const { data: productos = [], refetch: refetchProductos } = trpc.productos.list.useQuery();

  const createRecetaMutation = trpc.recetas.create.useMutation();
  const updateRecetaMutation = trpc.recetas.update.useMutation();
  const deleteRecetaMutation = trpc.recetas.delete.useMutation();
  const createProductoMutation = trpc.productos.create.useMutation();

  const productoSeleccionado = productos.find(p => p.id.toString() === selectedProductoId);
  const recetasProducto = recetas?.filter(r => r.productoId?.toString() === selectedProductoId) || [];
  const unidadesAProducir = parseFloat(cantidadProducir || '1') || 1;

  const getComponente = (id: number) => productos.find(p => p.id === id);

  const getEstado = (receta: { insumoId: number; cantidad: string }) => {
    const comp = getComponente(receta.insumoId);
    if (!comp) return 'unknown';
    const stock = toNum(comp.stock);
    const necesario = toNum(receta.cantidad) * unidadesAProducir;
    if (stock >= necesario) return 'ok';
    if (stock > 0) return 'bajo';
    return 'sin_stock';
  };

  const todosDisponibles =
    recetasProducto.length > 0 && recetasProducto.every(r => getEstado(r) === 'ok');

  const abrirAgregar = () => {
    setEditingRecetaId(null);
    setFormData(emptyComponente);
    setShowNuevoComponente(false);
    setOpen(true);
  };

  const abrirEditar = (receta: NonNullable<typeof recetas>[number]) => {
    setEditingRecetaId(receta.id);
    setFormData({
      insumoId: receta.insumoId.toString(),
      cantidad: parseFloat(receta.cantidad).toString(),
      unidad: receta.unidad,
    });
    setShowNuevoComponente(false);
    setOpen(true);
  };

  // ── Agregar / editar componente de la receta ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductoId) { toast.error('Seleccioná un producto primero'); return; }
    if (!formData.insumoId) { toast.error('Elegí el componente'); return; }
    try {
      if (editingRecetaId) {
        await updateRecetaMutation.mutateAsync({
          id: editingRecetaId,
          insumoId: parseInt(formData.insumoId),
          cantidad: parseFloat(formData.cantidad),
          unidad: formData.unidad,
        });
        toast.success('Componente actualizado');
      } else {
        await createRecetaMutation.mutateAsync({
          productoId: parseInt(selectedProductoId),
          insumoId: parseInt(formData.insumoId),
          cantidad: parseFloat(formData.cantidad),
          unidad: formData.unidad,
        });
        toast.success('Componente agregado a la receta');
      }
      setOpen(false);
      setFormData(emptyComponente);
      setShowNuevoComponente(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar este componente de la receta?')) {
      try {
        await deleteRecetaMutation.mutateAsync(id);
        toast.success('Componente eliminado');
        await refetch();
      } catch (error: any) {
        toast.error(error?.message || 'Error al eliminar');
      }
    }
  };

  // ── Crear un componente nuevo desde el dialog (queda en Productos) ──
  const handleCrearComponente = async () => {
    if (!nuevoComponente.nombre || !nuevoComponente.unidad) {
      toast.error('Completá descripción y unidad');
      return;
    }
    try {
      const { id } = await createProductoMutation.mutateAsync({
        codigo: nuevoComponente.codigo,
        nombre: nuevoComponente.nombre,
        unidad: nuevoComponente.unidad,
        stock: parseFloat(nuevoComponente.stock || '0'),
        costo: parseFloat(nuevoComponente.costo || '0'),
      });
      toast.success(`"${nuevoComponente.nombre}" creado en Productos`);
      await refetchProductos();
      setFormData(f => ({ ...f, insumoId: id.toString(), unidad: nuevoComponente.unidad }));
      setNuevoComponente(emptyNuevoComponente);
      setShowNuevoComponente(false);
    } catch (error: any) {
      toast.error(error?.message || 'Error al crear el componente');
    }
  };

  // ── Crear nuevo producto desde el selector ──
  const handleCrearProducto = async () => {
    if (!nuevoProducto.nombre) { toast.error('Ingresá el nombre del producto'); return; }
    try {
      const { id } = await createProductoMutation.mutateAsync({
        nombre: nuevoProducto.nombre,
        stock: parseFloat(nuevoProducto.stock || '0'),
        precioVenta: parseFloat(nuevoProducto.precioVenta || '0'),
      });
      toast.success(`Producto "${nuevoProducto.nombre}" creado`);
      await refetchProductos();
      setSelectedProductoId(id.toString());
      setNuevoProducto(emptyNuevoProducto);
      setShowNuevoProducto(false);
    } catch (error: any) {
      toast.error(error?.message || 'Error al crear producto');
    }
  };

  const autocompletarUnidad = (insumoId: string) => {
    const comp = productos.find(p => p.id.toString() === insumoId);
    setFormData(f => ({ ...f, insumoId, unidad: comp?.unidad || f.unidad }));
  };

  const opcionesProductos = productos.map(p => ({
    value: p.id.toString(),
    label: p.nombre,
    search: `${p.codigo ?? ''} ${p.codigoProveedor ?? ''}`,
    hint: p.codigo ?? undefined,
  }));

  // Un producto no puede ser componente de sí mismo
  const opcionesComponentes = productos
    .filter(p => p.id.toString() !== selectedProductoId)
    .map(p => ({
      value: p.id.toString(),
      label: p.nombre,
      search: `${p.codigo ?? ''} ${p.codigoProveedor ?? ''}`,
      hint: `${p.codigo ? `${p.codigo} · ` : ''}stock: ${qty(p.stock)} ${p.unidad}`,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Recetas</h1>
        <p className="text-gray-600">Consultá y administrá los componentes necesarios para producir cada producto</p>
      </div>

      {/* Selector de producto */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleccionar producto</CardTitle>
          <CardDescription>Elegí el producto para ver o editar su receta</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <label className="text-sm font-medium mb-1 block">Producto</label>
              <SearchSelect
                value={selectedProductoId}
                onChange={setSelectedProductoId}
                placeholder="Seleccionar producto..."
                options={opcionesProductos}
              />
            </div>
            <div className="w-40">
              <label className="text-sm font-medium mb-1 block">Unidades a producir</label>
              <Input
                type="number" min="1" step="1"
                value={cantidadProducir}
                onChange={e => setCantidadProducir(e.target.value)}
                placeholder="1"
              />
            </div>
            <Button
              variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-50 shrink-0"
              onClick={() => { setShowNuevoProducto(v => !v); setNuevoProducto(emptyNuevoProducto); }}
            >
              <PackagePlus className="w-4 h-4 mr-2" />
              Nuevo producto
            </Button>
          </div>

          {/* Formulario inline: nuevo producto */}
          {showNuevoProducto && (
            <div className="border border-orange-200 rounded-lg p-4 bg-orange-50 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-orange-800">Crear nuevo producto</p>
                <button onClick={() => setShowNuevoProducto(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Input
                placeholder="Nombre del producto *"
                value={nuevoProducto.nombre}
                onChange={e => setNuevoProducto(f => ({ ...f, nombre: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number" step="0.01" placeholder="Stock inicial"
                  value={nuevoProducto.stock}
                  onChange={e => setNuevoProducto(f => ({ ...f, stock: e.target.value }))}
                />
                <Input
                  type="number" step="0.01" placeholder="Precio de lista"
                  value={nuevoProducto.precioVenta}
                  onChange={e => setNuevoProducto(f => ({ ...f, precioVenta: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setShowNuevoProducto(false)}>Cancelar</Button>
                <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={handleCrearProducto}>
                  <Plus className="w-4 h-4 mr-1" /> Crear y seleccionar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panel de disponibilidad */}
      {selectedProductoId ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-orange-500" />
                Componentes de {productoSeleccionado?.nombre}
              </CardTitle>
              <CardDescription>
                Stock necesario para producir {unidadesAProducir} unidad{unidadesAProducir !== 1 ? 'es' : ''}
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {recetasProducto.length > 0 && (
                <Badge className={todosDisponibles
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-red-100 text-red-800 border-red-200'}>
                  {todosDisponibles ? '✓ Stock suficiente' : '✗ Stock insuficiente'}
                </Badge>
              )}
              <Button size="sm" className="bg-orange-600 hover:bg-orange-700" onClick={abrirAgregar}>
                <Plus className="w-4 h-4 mr-1" /> Agregar componente
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {recetasProducto.length === 0 ? (
              <div className="text-center py-10 text-gray-400 space-y-2">
                <FlaskConical className="w-10 h-10 mx-auto opacity-30" />
                <p>Este producto no tiene componentes en su receta.</p>
                <p className="text-sm">Hacé clic en "Agregar componente" para comenzar.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-orange-50 hover:bg-orange-50">
                    <TableHead>Componente</TableHead>
                    <TableHead>Necesario por unidad</TableHead>
                    <TableHead>Total necesario</TableHead>
                    <TableHead>Stock actual</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recetasProducto.map(receta => {
                    const comp = getComponente(receta.insumoId);
                    const stockActual = toNum(comp?.stock);
                    const necesarioPorUnidad = toNum(receta.cantidad);
                    const totalNecesario = necesarioPorUnidad * unidadesAProducir;
                    const estado = getEstado(receta);
                    return (
                      <TableRow key={receta.id} className="hover:bg-orange-50/50">
                        <TableCell className="font-medium">
                          {comp?.nombre || `Producto ${receta.insumoId}`}
                          {comp?.codigo && <span className="ml-2 font-mono text-xs text-gray-400">{comp.codigo}</span>}
                        </TableCell>
                        <TableCell className="text-gray-600">{qty(necesarioPorUnidad)} {receta.unidad}</TableCell>
                        <TableCell className="font-semibold">{qty(totalNecesario)} {receta.unidad}</TableCell>
                        <TableCell className={
                          estado === 'ok' ? 'text-green-700 font-semibold' :
                          estado === 'bajo' ? 'text-yellow-700 font-semibold' : 'text-red-700 font-semibold'
                        }>
                          {qty(stockActual)} {comp?.unidad}
                        </TableCell>
                        <TableCell>
                          {estado === 'ok' && <span className="flex items-center gap-1 text-green-700 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /> Disponible</span>}
                          {estado === 'bajo' && <span className="flex items-center gap-1 text-yellow-700 text-sm font-medium"><AlertCircle className="w-4 h-4" /> Stock bajo</span>}
                          {estado === 'sin_stock' && <span className="flex items-center gap-1 text-red-700 text-sm font-medium"><XCircle className="w-4 h-4" /> Sin stock</span>}
                          {estado === 'unknown' && <span className="text-gray-400 text-sm">No encontrado</span>}
                        </TableCell>
                        <TableCell className="text-right space-x-1 whitespace-nowrap">
                          <Button variant="ghost" size="sm" onClick={() => abrirEditar(receta)} className="text-orange-600 hover:text-orange-700 hover:bg-orange-100" title="Editar componente">
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(receta.id)} className="text-red-600 hover:text-red-700 hover:bg-red-100" title="Quitar de la receta">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-gray-400 space-y-2">
            <FlaskConical className="w-12 h-12 mx-auto opacity-20" />
            <p className="text-lg">Seleccioná un producto para ver su receta</p>
          </CardContent>
        </Card>
      )}

      {/* Dialog: agregar / editar componente */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setShowNuevoComponente(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingRecetaId ? 'Editar componente' : 'Agregar componente'}</DialogTitle>
            <DialogDescription>
              {editingRecetaId ? 'Modificá el componente de la receta de ' : 'Agregá un componente a la receta de '}
              <strong>{productoSeleccionado?.nombre}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selector de componente */}
            {!showNuevoComponente && (
              <div>
                <label className="text-sm font-medium mb-1 block">Componente</label>
                <SearchSelect
                  value={formData.insumoId}
                  onChange={autocompletarUnidad}
                  placeholder="Seleccionar componente..."
                  options={opcionesComponentes}
                />
                {!editingRecetaId && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2 w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() => { setShowNuevoComponente(true); setNuevoComponente(emptyNuevoComponente); }}
                  >
                    <PackagePlus className="w-4 h-4 mr-2" />
                    ¿No está? Crear nuevo componente
                  </Button>
                )}
              </div>
            )}

            {/* Formulario inline: crear nuevo componente */}
            {showNuevoComponente && (
              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50 space-y-3">
                <p className="text-sm font-semibold text-orange-800">Crear nuevo componente <span className="font-normal">(se guarda en Productos)</span></p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Código interno"
                    value={nuevoComponente.codigo}
                    onChange={e => setNuevoComponente(f => ({ ...f, codigo: e.target.value }))}
                  />
                  <Input
                    placeholder="Unidad (kg, L, m...) *"
                    value={nuevoComponente.unidad}
                    onChange={e => setNuevoComponente(f => ({ ...f, unidad: e.target.value }))}
                  />
                </div>
                <Input
                  placeholder="Descripción *"
                  value={nuevoComponente.nombre}
                  onChange={e => setNuevoComponente(f => ({ ...f, nombre: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number" step="0.001" placeholder="Stock inicial"
                    value={nuevoComponente.stock}
                    onChange={e => setNuevoComponente(f => ({ ...f, stock: e.target.value }))}
                  />
                  <Input
                    type="number" step="0.01" placeholder="Costo unitario"
                    value={nuevoComponente.costo}
                    onChange={e => setNuevoComponente(f => ({ ...f, costo: e.target.value }))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowNuevoComponente(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" size="sm" className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleCrearComponente}>
                    <Plus className="w-4 h-4 mr-1" /> Crear y usar en receta
                  </Button>
                </div>
              </div>
            )}

            {/* Cantidad y unidad */}
            {!showNuevoComponente && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Cantidad por unidad</label>
                  <Input
                    type="number" step="0.001" min="0.001" placeholder="0.000"
                    value={formData.cantidad}
                    onChange={e => setFormData(f => ({ ...f, cantidad: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Unidad</label>
                  <Input
                    placeholder="kg, L, m, u..."
                    value={formData.unidad}
                    onChange={e => setFormData(f => ({ ...f, unidad: e.target.value }))}
                    required
                  />
                </div>
              </div>
            )}

            {!showNuevoComponente && (
              <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                {editingRecetaId ? 'Guardar cambios' : <><Plus className="w-4 h-4 mr-2" /> Agregar a la receta</>}
              </Button>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
