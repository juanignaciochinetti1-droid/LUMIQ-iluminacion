import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, Search, Printer } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { LineasEditor, ResumenTotales, lineasDesdeDocumento, lineasIniciales, lineasParaEnviar, repreciar, type Linea } from '@/components/LineasEditor';
import { ClienteField, nuevoClienteParaEnviar, type NuevoClienteForm } from '@/components/ClienteField';
import { htmlCotizacion, printHtml, type CotizacionRow } from '@/lib/print';
import { fechaAR, hoy, money, qty } from '@/lib/format';
import { CONDICION_LABELS, type CondicionPago } from '@shared/pricing';

type Estado = 'pendiente' | 'aceptada' | 'rechazada';

const ESTADO_LABELS: Record<Estado, string> = { pendiente: 'Pendiente', aceptada: 'Aceptada', rechazada: 'Rechazada' };
const ESTADO_CLASES: Record<Estado, string> = {
  pendiente: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  aceptada: 'bg-green-100 text-green-800 border-green-200',
  rechazada: 'bg-red-100 text-red-800 border-red-200',
};

const formVacio = () => ({
  fecha: hoy(),
  clienteId: '',
  condicionPago: 'lista' as CondicionPago,
  descuento: '',
  estado: 'pendiente' as Estado,
  comentarios: '',
});

export default function Cotizaciones() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [form, setForm] = useState(formVacio);
  const [nuevoCliente, setNuevoCliente] = useState<NuevoClienteForm | null>(null);
  const [lineas, setLineas] = useState<Linea[]>(lineasIniciales);

  const utils = trpc.useUtils();
  const { data: cotizaciones = [] } = trpc.cotizaciones.list.useQuery();
  const { data: productos = [] } = trpc.productos.list.useQuery();
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  const createMutation = trpc.cotizaciones.create.useMutation();
  const updateMutation = trpc.cotizaciones.update.useMutation();
  const deleteMutation = trpc.cotizaciones.delete.useMutation();

  const abrirNueva = () => {
    setEditingId(null);
    setForm(formVacio());
    setNuevoCliente(null);
    setLineas(lineasIniciales());
    setOpen(true);
  };

  const abrirEditar = (c: CotizacionRow) => {
    setEditingId(c.id);
    setForm({
      fecha: c.fecha,
      clienteId: c.clienteId ? String(c.clienteId) : '',
      condicionPago: c.condicionPago === 'cuenta_corriente' ? 'lista' : c.condicionPago,
      descuento: parseFloat(c.descuento) ? String(parseFloat(c.descuento)) : '',
      estado: c.estado,
      comentarios: c.comentarios ?? '',
    });
    setNuevoCliente(null);
    setLineas(lineasDesdeDocumento(c.items));
    setOpen(true);
  };

  const cambiarCondicion = (condicionPago: CondicionPago) => {
    setForm(f => ({ ...f, condicionPago }));
    setLineas(ls => repreciar(ls, productos, condicionPago));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = lineasParaEnviar(lineas);
    if (items.length === 0) { toast.error('Cargá al menos un artículo'); return; }
    if (items.some(i => i.cantidad <= 0)) { toast.error('Todas las líneas con producto necesitan una cantidad mayor a 0'); return; }
    if (nuevoCliente && !nuevoCliente.nombre.trim()) { toast.error('Ingresá nombre y apellido del cliente nuevo'); return; }

    const datos = {
      fecha: form.fecha,
      clienteId: form.clienteId ? parseInt(form.clienteId) : null,
      nuevoCliente: nuevoClienteParaEnviar(nuevoCliente),
      condicionPago: form.condicionPago,
      descuento: form.descuento === '' ? 0 : parseFloat(form.descuento),
      estado: form.estado,
      comentarios: form.comentarios,
      items,
    };
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...datos });
        toast.success('Cotización actualizada');
      } else {
        const r = await createMutation.mutateAsync(datos);
        toast.success(`Cotización N° ${r.numero} creada`);
      }
      setOpen(false);
      await Promise.all([utils.cotizaciones.list.invalidate(), utils.clientes.list.invalidate()]);
    } catch (error: any) {
      toast.error(error?.message || 'Error al guardar la cotización');
    }
  };

  const handleDelete = async (c: CotizacionRow) => {
    if (!confirm(`¿Eliminar la cotización N° ${c.numero}?`)) return;
    try {
      await deleteMutation.mutateAsync(c.id);
      toast.success('Cotización eliminada');
      await utils.cotizaciones.list.invalidate();
    } catch (error: any) {
      toast.error(error?.message || 'Error al eliminar');
    }
  };

  const getProductoNombre = (id: number) => productos.find(p => p.id === id)?.nombre || `Producto ${id}`;

  const term = search.trim().toLowerCase();
  const filtradas = cotizaciones.filter(c =>
    (estadoFilter === 'todos' || c.estado === estadoFilter) &&
    (!term ||
      String(c.numero) === term ||
      c.clienteNombre?.toLowerCase().includes(term) ||
      c.comentarios?.toLowerCase().includes(term) ||
      c.items.some(i => getProductoNombre(i.productoId).toLowerCase().includes(term)))
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cotizaciones</h1>
          <p className="text-gray-600">Presupuestos para clientes. No descuentan stock.</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={abrirNueva}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cotización
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Nueva'} Cotización</DialogTitle>
            <DialogDescription>
              Elegí un cliente o cargá uno nuevo: queda guardado en la pestaña Clientes.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Fecha</label>
                <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Precios según</label>
                <Select value={form.condicionPago} onValueChange={(v) => cambiarCondicion(v as CondicionPago)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lista">{CONDICION_LABELS.lista}</SelectItem>
                    <SelectItem value="contado">{CONDICION_LABELS.contado} (con descuento de cada producto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Estado</label>
                <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v as Estado })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ESTADO_LABELS) as Estado[]).map(e => <SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Cliente</label>
              <ClienteField
                clientes={clientes}
                clienteId={form.clienteId}
                onClienteId={(id) => setForm({ ...form, clienteId: id })}
                nuevo={nuevoCliente}
                onNuevo={(n) => { setNuevoCliente(n); if (n) setForm(f => ({ ...f, clienteId: '' })); }}
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Artículos</label>
              <LineasEditor lineas={lineas} onChange={setLineas} productos={productos} condicion={form.condicionPago} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 items-start">
              <div>
                <label className="text-sm font-medium">Comentarios</label>
                <Textarea
                  placeholder="Validez, plazos de entrega, condiciones... (se imprimen en la cotización)"
                  rows={3}
                  value={form.comentarios}
                  onChange={(e) => setForm({ ...form, comentarios: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Descuento general (%)</label>
                  <Input
                    type="number" step="0.1" min="0" max="100" placeholder="0"
                    value={form.descuento}
                    onChange={(e) => setForm({ ...form, descuento: e.target.value })}
                  />
                </div>
                <ResumenTotales lineas={lineas} descuentoGeneral={form.descuento} />
              </div>
            </div>

            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={createMutation.isPending || updateMutation.isPending}>
              {editingId ? 'Guardar cambios' : 'Crear Cotización'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por N°, cliente, producto o comentario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0"
            />
          </div>
          <div className="w-56">
            <label className="text-xs font-medium text-gray-500">Estado</label>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {(Object.keys(ESTADO_LABELS) as Estado[]).map(e => <SelectItem key={e} value={e}>{ESTADO_LABELS[e]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-orange-50 hover:bg-orange-50">
                  <TableHead>N°</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Artículos</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.map(c => (
                  <TableRow key={c.id} className="hover:bg-orange-50/50 align-top">
                    <TableCell className="font-bold text-orange-600">{c.numero}</TableCell>
                    <TableCell>{fechaAR(c.fecha)}</TableCell>
                    <TableCell>{c.clienteNombre || <span className="text-gray-400">Sin cliente</span>}</TableCell>
                    <TableCell className="text-sm max-w-xs">
                      {c.items.slice(0, 3).map(i => (
                        <div key={i.id} className="truncate">{qty(i.cantidad)} × {getProductoNombre(i.productoId)}</div>
                      ))}
                      {c.items.length > 3 && <div className="text-gray-500">+{c.items.length - 3} más</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-orange-600">{money(c.total)}</div>
                      <div className="text-xs text-gray-500">{CONDICION_LABELS[c.condicionPago]}{parseFloat(c.descuento) > 0 ? ` · desc. ${qty(c.descuento)}%` : ''}</div>
                    </TableCell>
                    <TableCell><Badge className={ESTADO_CLASES[c.estado]}>{ESTADO_LABELS[c.estado]}</Badge></TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      <Button
                        variant="ghost" size="sm" title="Imprimir cotización"
                        onClick={() => printHtml(htmlCotizacion(c, productos, clientes.find(x => x.id === c.clienteId)))}
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => abrirEditar(c)} className="text-orange-600 hover:text-orange-700 hover:bg-orange-100" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c)} className="text-red-600 hover:text-red-700 hover:bg-red-100" title="Eliminar">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtradas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {cotizaciones.length > 0 ? 'Ninguna cotización coincide con los filtros' : 'No hay cotizaciones registradas'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
