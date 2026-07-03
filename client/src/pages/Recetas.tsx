import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, CheckCircle2, XCircle, AlertCircle, FlaskConical, PackagePlus, X } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const emptyNuevoInsumo = { codigo: '', descripcion: '', unidad: '', cantidad: '0', precioUnitario: '0' };
const emptyNuevoProducto = { nombre: '', stock: '0', precioVenta: '0' };

export default function Recetas() {
  const [selectedProductoId, setSelectedProductoId] = useState<string>('');
  const [cantidadProducir, setCantidadProducir] = useState<string>('1');

  // Dialog agregar componente
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ insumoId: '', cantidad: '', unidad: '' });

  // Inline: crear nuevo insumo dentro del dialog
  const [showNuevoInsumo, setShowNuevoInsumo] = useState(false);
  const [nuevoInsumo, setNuevoInsumo] = useState(emptyNuevoInsumo);

  // Inline: crear nuevo producto en el selector principal
  const [showNuevoProducto, setShowNuevoProducto] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState(emptyNuevoProducto);

  const { data: recetas, refetch } = trpc.recetas.list.useQuery();
  const { data: productos, refetch: refetchProductos } = trpc.productos.list.useQuery();
  const { data: insumos, refetch: refetchInsumos } = trpc.insumos.list.useQuery();

  const createRecetaMutation = trpc.recetas.create.useMutation();
  const deleteRecetaMutation = trpc.recetas.delete.useMutation();
  const createInsumoMutation = trpc.insumos.create.useMutation();
  const createProductoMutation = trpc.productos.create.useMutation();

  const productoSeleccionado = productos?.find(p => p.id.toString() === selectedProductoId);
  const recetasProducto = recetas?.filter(r => r.productoId?.toString() === selectedProductoId) || [];
  const unidadesAProducir = parseFloat(cantidadProducir || '1') || 1;

  const getInsumo = (id: number) => insumos?.find(i => i.id === id);

  const getEstado = (receta: any) => {
    const insumo = getInsumo(receta.insumoId);
    if (!insumo) return 'unknown';
    const stock = parseFloat(insumo.cantidad?.toString() || '0');
    const necesario = parseFloat(receta.cantidad?.toString() || '0') * unidadesAProducir;
    if (stock >= necesario) return 'ok';
    if (stock > 0) return 'bajo';
    return 'sin_stock';
  };

  const todosDisponibles =
    recetasProducto.length > 0 && recetasProducto.every(r => getEstado(r) === 'ok');

  // ── Agregar componente a receta ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductoId) { toast.error('Seleccioná un producto primero'); return; }
    try {
      await createRecetaMutation.mutateAsync({
        productoId: parseInt(selectedProductoId),
        insumoId: parseInt(formData.insumoId),
        cantidad: parseFloat(formData.cantidad),
        unidad: formData.unidad,
      });
      toast.success('Componente agregado a la receta');
      setOpen(false);
      setFormData({ insumoId: '', cantidad: '', unidad: '' });
      setShowNuevoInsumo(false);
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

  // ── Crear nuevo insumo desde el dialog ──
  const handleCrearInsumo = async () => {
    if (!nuevoInsumo.codigo || !nuevoInsumo.descripcion || !nuevoInsumo.unidad) {
      toast.error('Completá código, descripción y unidad');
      return;
    }
    try {
      await createInsumoMutation.mutateAsync({
        codigo: nuevoInsumo.codigo,
        descripcion: nuevoInsumo.descripcion,
        unidad: nuevoInsumo.unidad,
        cantidad: parseFloat(nuevoInsumo.cantidad || '0'),
        precioUnitario: parseFloat(nuevoInsumo.precioUnitario || '0'),
      });
      toast.success(`Insumo "${nuevoInsumo.descripcion}" creado`);
      const updated = await refetchInsumos();
      // Auto-seleccionar el recién creado
      const creado = updated.data?.find(i => i.codigo === nuevoInsumo.codigo && i.descripcion === nuevoInsumo.descripcion);
      if (creado) {
        setFormData(f => ({ ...f, insumoId: creado.id.toString(), unidad: creado.unidad }));
      }
      setNuevoInsumo(emptyNuevoInsumo);
      setShowNuevoInsumo(false);
    } catch (error: any) {
      toast.error(error?.message || 'Error al crear insumo');
    }
  };

  // ── Crear nuevo producto desde el selector ──
  const handleCrearProducto = async () => {
    if (!nuevoProducto.nombre) { toast.error('Ingresá el nombre del producto'); return; }
    try {
      await createProductoMutation.mutateAsync({
        nombre: nuevoProducto.nombre,
        stock: parseFloat(nuevoProducto.stock || '0'),
        precioVenta: parseFloat(nuevoProducto.precioVenta || '0'),
      });
      toast.success(`Producto "${nuevoProducto.nombre}" creado`);
      const updated = await refetchProductos();
      const creado = updated.data?.find(p => p.nombre === nuevoProducto.nombre);
      if (creado) setSelectedProductoId(creado.id.toString());
      setNuevoProducto(emptyNuevoProducto);
      setShowNuevoProducto(false);
    } catch (error: any) {
      toast.error(error?.message || 'Error al crear producto');
    }
  };

  const autocompletarUnidad = (insumoId: string) => {
    const insumo = insumos?.find(i => i.id.toString() === insumoId);
    setFormData(f => ({ ...f, insumoId, unidad: insumo?.unidad || '' }));
  };

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
              <Select value={selectedProductoId} onValueChange={setSelectedProductoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent>
                  {productos?.map(p => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  type="number" step="0.01" placeholder="Precio de venta"
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
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700"
                onClick={() => { setFormData({ insumoId: '', cantidad: '', unidad: '' }); setShowNuevoInsumo(false); setOpen(true); }}
              >
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
                    <TableHead>Insumo</TableHead>
                    <TableHead>Necesario por unidad</TableHead>
                    <TableHead>Total necesario</TableHead>
                    <TableHead>Stock actual</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recetasProducto.map(receta => {
                    const insumo = getInsumo(receta.insumoId);
                    const stockActual = parseFloat(insumo?.cantidad?.toString() || '0');
                    const necesarioPorUnidad = parseFloat(receta.cantidad?.toString() || '0');
                    const totalNecesario = necesarioPorUnidad * unidadesAProducir;
                    const estado = getEstado(receta);
                    return (
                      <TableRow key={receta.id} className="hover:bg-orange-50/50">
                        <TableCell className="font-medium">{insumo?.descripcion || `Insumo ${receta.insumoId}`}</TableCell>
                        <TableCell className="text-gray-600">{necesarioPorUnidad.toFixed(3)} {receta.unidad}</TableCell>
                        <TableCell className="font-semibold">{totalNecesario.toFixed(3)} {receta.unidad}</TableCell>
                        <TableCell className={
                          estado === 'ok' ? 'text-green-700 font-semibold' :
                          estado === 'bajo' ? 'text-yellow-700 font-semibold' : 'text-red-700 font-semibold'
                        }>
                          {stockActual.toFixed(3)} {insumo?.unidad}
                        </TableCell>
                        <TableCell>
                          {estado === 'ok' && <span className="flex items-center gap-1 text-green-700 text-sm font-medium"><CheckCircle2 className="w-4 h-4" /> Disponible</span>}
                          {estado === 'bajo' && <span className="flex items-center gap-1 text-yellow-700 text-sm font-medium"><AlertCircle className="w-4 h-4" /> Stock bajo</span>}
                          {estado === 'sin_stock' && <span className="flex items-center gap-1 text-red-700 text-sm font-medium"><XCircle className="w-4 h-4" /> Sin stock</span>}
                          {estado === 'unknown' && <span className="text-gray-400 text-sm">No encontrado</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(receta.id)} className="text-red-600 hover:text-red-700 hover:bg-red-100">
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

      {/* Dialog: agregar componente */}
      <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) setShowNuevoInsumo(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Agregar componente</DialogTitle>
            <DialogDescription>
              Agregá un insumo a la receta de <strong>{productoSeleccionado?.nombre}</strong>
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Selector de insumo */}
            {!showNuevoInsumo && (
              <div>
                <label className="text-sm font-medium mb-1 block">Insumo</label>
                <Select value={formData.insumoId} onValueChange={autocompletarUnidad}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar insumo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {insumos?.map(i => (
                      <SelectItem key={i.id} value={i.id.toString()}>
                        {i.descripcion}
                        <span className="text-gray-400 ml-2 text-xs">
                          (stock: {parseFloat(i.cantidad?.toString() || '0').toFixed(3)} {i.unidad})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={() => { setShowNuevoInsumo(true); setNuevoInsumo(emptyNuevoInsumo); }}
                >
                  <PackagePlus className="w-4 h-4 mr-2" />
                  ¿No está el insumo? Crear nuevo
                </Button>
              </div>
            )}

            {/* Formulario inline: crear nuevo insumo */}
            {showNuevoInsumo && (
              <div className="border border-orange-200 rounded-lg p-4 bg-orange-50 space-y-3">
                <p className="text-sm font-semibold text-orange-800">Crear nuevo insumo</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    placeholder="Código *"
                    value={nuevoInsumo.codigo}
                    onChange={e => setNuevoInsumo(f => ({ ...f, codigo: e.target.value }))}
                  />
                  <Input
                    placeholder="Unidad (kg, L, m...) *"
                    value={nuevoInsumo.unidad}
                    onChange={e => setNuevoInsumo(f => ({ ...f, unidad: e.target.value }))}
                  />
                </div>
                <Input
                  placeholder="Descripción *"
                  value={nuevoInsumo.descripcion}
                  onChange={e => setNuevoInsumo(f => ({ ...f, descripcion: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="number" step="0.001" placeholder="Stock inicial"
                    value={nuevoInsumo.cantidad}
                    onChange={e => setNuevoInsumo(f => ({ ...f, cantidad: e.target.value }))}
                  />
                  <Input
                    type="number" step="0.01" placeholder="Precio unitario"
                    value={nuevoInsumo.precioUnitario}
                    onChange={e => setNuevoInsumo(f => ({ ...f, precioUnitario: e.target.value }))}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  onClick={handleCrearInsumo}
                >
                  <Plus className="w-4 h-4 mr-1" /> Crear insumo y usar en receta
                </Button>
              </div>
            )}

            {/* Cantidad y unidad */}
            {!showNuevoInsumo && (
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

            {!showNuevoInsumo && (
              <div className="flex flex-col gap-2">
                <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4 mr-2" /> Agregar a la receta
                </Button>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-200" /></div>
                  <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">o</span></div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
                  onClick={() => { setOpen(false); setTimeout(() => { setShowNuevoProducto(true); setNuevoProducto(emptyNuevoProducto); }, 150); }}
                >
                  <PackagePlus className="w-4 h-4 mr-2" />
                  ¿No está el producto? Crear nuevo
                </Button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
