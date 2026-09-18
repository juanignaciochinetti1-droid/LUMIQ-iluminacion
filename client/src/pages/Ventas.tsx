import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Search, Printer, FileText, Truck } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { LineasEditor, ResumenTotales, lineasIniciales, lineasParaEnviar, repreciar, type Linea } from '@/components/LineasEditor';
import { ClienteField, nuevoClienteParaEnviar, type NuevoClienteForm } from '@/components/ClienteField';
import { ENTREGA_LABELS, htmlListadoRemitos, htmlListadoVentas, htmlRemito, htmlVenta, printHtml, type VentaRow } from '@/lib/print';
import { fechaAR, hoy, money, qty } from '@/lib/format';
import { CONDICION_LABELS, type CondicionPago } from '@shared/pricing';

const formVacio = () => ({
  fecha: hoy(),
  clienteId: '',
  dniCuit: '',
  direccion: '',
  localidad: '',
  entrega: '',
  condicionPago: 'lista' as CondicionPago,
  descuento: '',
  comentarios: '',
});

export default function Ventas() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [entregaFilter, setEntregaFilter] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [form, setForm] = useState(formVacio);
  const [nuevoCliente, setNuevoCliente] = useState<NuevoClienteForm | null>(null);
  const [lineas, setLineas] = useState<Linea[]>(lineasIniciales);

  const utils = trpc.useUtils();
  const { data: ventas } = trpc.ventas.list.useQuery();
  const { data: productos = [] } = trpc.productos.list.useQuery();
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  const createMutation = trpc.ventas.create.useMutation();
  const deleteMutation = trpc.ventas.delete.useMutation();
  const remitoMutation = trpc.ventas.generarRemito.useMutation();

  const refrescar = () => Promise.all([
    utils.ventas.list.invalidate(),
    utils.productos.list.invalidate(),
    utils.clientes.list.invalidate(),
    utils.cuentaCorriente.movimientos.invalidate(),
    utils.dashboard.invalidate(),
  ]);

  const cliente = clientes.find(c => String(c.id) === form.clienteId);
  const puedeCuentaCorriente = nuevoCliente ? nuevoCliente.tieneCuentaCorriente : !!cliente?.tieneCuentaCorriente;

  const abrirNueva = () => {
    setForm(formVacio());
    setNuevoCliente(null);
    setLineas(lineasIniciales());
    setOpen(true);
  };

  const cambiarCondicion = (condicionPago: CondicionPago) => {
    setForm(f => ({ ...f, condicionPago }));
    setLineas(ls => repreciar(ls, productos, condicionPago));
  };

  const elegirCliente = (clienteId: string) => {
    const c = clientes.find(x => String(x.id) === clienteId);
    setForm(f => ({
      ...f,
      clienteId,
      dniCuit: c?.dni ?? '',
      direccion: c?.direccion ?? '',
      condicionPago: f.condicionPago === 'cuenta_corriente' && !c?.tieneCuentaCorriente ? 'lista' : f.condicionPago,
    }));
    if (form.condicionPago === 'cuenta_corriente' && !c?.tieneCuentaCorriente) {
      setLineas(ls => repreciar(ls, productos, 'lista'));
    }
  };

  const cambiarNuevoCliente = (n: NuevoClienteForm | null) => {
    setNuevoCliente(n);
    if (n) setForm(f => ({ ...f, clienteId: '' }));
    // Sin cuenta corriente no se puede vender a cuenta corriente
    if (form.condicionPago === 'cuenta_corriente' && !n?.tieneCuentaCorriente) cambiarCondicion('lista');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const items = lineasParaEnviar(lineas);
    if (items.length === 0) { toast.error('Cargá al menos un artículo'); return; }
    if (items.some(i => i.cantidad <= 0)) { toast.error('Todas las líneas con producto necesitan una cantidad mayor a 0'); return; }
    if (nuevoCliente && !nuevoCliente.nombre.trim()) { toast.error('Ingresá nombre y apellido del cliente nuevo'); return; }

    try {
      const r = await createMutation.mutateAsync({
        fecha: form.fecha,
        clienteId: form.clienteId ? parseInt(form.clienteId) : null,
        nuevoCliente: nuevoClienteParaEnviar(nuevoCliente),
        dniCuit: form.dniCuit,
        direccion: form.direccion,
        localidad: form.localidad,
        entrega: form.entrega ? (form.entrega as 'retiro_local' | 'mercado_libre' | 'envio') : undefined,
        condicionPago: form.condicionPago,
        descuento: form.descuento === '' ? 0 : parseFloat(form.descuento),
        comentarios: form.comentarios,
        items,
      });
      toast.success(`Venta N° ${r.numero} registrada. Stock descontado automáticamente.`);
      setOpen(false);
      await refrescar();
    } catch (error: any) {
      toast.error(error?.message || 'Error al registrar venta');
    }
  };

  const handleDelete = async (v: VentaRow) => {
    if (confirm(`¿Eliminar la venta N° ${v.numero}? El stock de los productos será restaurado${v.condicionPago === 'cuenta_corriente' ? ' y se quitará el cargo de la cuenta corriente' : ''}.`)) {
      try {
        await deleteMutation.mutateAsync(v.id);
        toast.success('Venta eliminada');
        await refrescar();
      } catch (error: any) {
        toast.error(error?.message || 'Error al eliminar');
      }
    }
  };

  /** Genera el número de remito la primera vez; después reimprime el mismo. */
  const handleRemito = async (v: VentaRow) => {
    try {
      const numero = v.remitoNumero ?? (await remitoMutation.mutateAsync(v.id)).remitoNumero;
      printHtml(htmlRemito(v, productos, numero));
      if (!v.remitoNumero) {
        toast.success(`Remito N° ${numero} generado`);
        await utils.ventas.list.invalidate();
      }
    } catch (error: any) {
      toast.error(error?.message || 'Error al generar el remito');
    }
  };

  const getProductoNombre = (id: number) => productos.find(p => p.id === id)?.nombre || `Producto ${id}`;

  const filteredVentas = useMemo(() => (ventas || []).filter(v => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term ||
      String(v.numero) === term ||
      String(v.remitoNumero ?? '') === term ||
      v.remito?.toLowerCase().includes(term) ||
      v.dniCuit?.toLowerCase().includes(term) ||
      v.clienteNombre?.toLowerCase().includes(term) ||
      v.localidad?.toLowerCase().includes(term) ||
      v.comentarios?.toLowerCase().includes(term) ||
      v.items.some(i => getProductoNombre(i.productoId).toLowerCase().includes(term));
    const matchesEntrega = entregaFilter === 'todos' || v.entrega === entregaFilter;
    const matchesDesde = !fechaDesde || v.fecha >= fechaDesde;
    const matchesHasta = !fechaHasta || v.fecha <= fechaHasta;
    return matchesSearch && matchesEntrega && matchesDesde && matchesHasta;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [ventas, productos, search, entregaFilter, fechaDesde, fechaHasta]);

  const descripcionFiltros = [
    fechaDesde && `desde ${fechaAR(fechaDesde)}`,
    fechaHasta && `hasta ${fechaAR(fechaHasta)}`,
    entregaFilter !== 'todos' && ENTREGA_LABELS[entregaFilter],
    search.trim() && `búsqueda "${search.trim()}"`,
  ].filter(Boolean).join(' · ');

  const imprimirVentas = () => {
    if (filteredVentas.length === 0) { toast.error('No hay ventas para imprimir'); return; }
    printHtml(htmlListadoVentas(filteredVentas, productos, descripcionFiltros));
  };

  const imprimirRemitos = () => {
    const conRemito = filteredVentas.filter(v => v.remitoNumero || v.remito);
    if (conRemito.length === 0) { toast.error('No hay remitos generados para imprimir'); return; }
    printHtml(htmlListadoRemitos(conRemito, productos, descripcionFiltros));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ventas</h1>
          <p className="text-gray-600">Registra las ventas de productos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={imprimirVentas}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir ventas
          </Button>
          <Button variant="outline" onClick={imprimirRemitos}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir remitos
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700" onClick={abrirNueva}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Venta
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Venta</DialogTitle>
            <DialogDescription>
              El stock se descontará automáticamente. El número de venta se asigna al guardar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">Fecha</label>
                <Input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium">Condición de pago</label>
                <Select value={form.condicionPago} onValueChange={(v) => cambiarCondicion(v as CondicionPago)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lista">{CONDICION_LABELS.lista}</SelectItem>
                    <SelectItem value="contado">{CONDICION_LABELS.contado} (con descuento de cada producto)</SelectItem>
                    <SelectItem value="cuenta_corriente" disabled={!puedeCuentaCorriente}>
                      {CONDICION_LABELS.cuenta_corriente}{puedeCuentaCorriente ? '' : ' (el cliente no tiene)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Modo de Entrega</label>
                <Select value={form.entrega} onValueChange={(v) => setForm({ ...form, entrega: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar modo de entrega" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retiro_local">Retiro en el local</SelectItem>
                    <SelectItem value="mercado_libre">Mercado Libre</SelectItem>
                    <SelectItem value="envio">Envío</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">Cliente</label>
              <ClienteField
                clientes={clientes}
                clienteId={form.clienteId}
                onClienteId={elegirCliente}
                nuevo={nuevoCliente}
                onNuevo={cambiarNuevoCliente}
              />
            </div>

            {!nuevoCliente && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">DNI/CUIT</label>
                  <Input placeholder="DNI o CUIT del cliente" value={form.dniCuit} onChange={(e) => setForm({ ...form, dniCuit: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Dirección</label>
                  <Input placeholder="Dirección de entrega" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
                </div>
                <div>
                  <label className="text-sm font-medium">Localidad</label>
                  <Input placeholder="Localidad" value={form.localidad} onChange={(e) => setForm({ ...form, localidad: e.target.value })} />
                </div>
              </div>
            )}
            {nuevoCliente && (
              <div>
                <label className="text-sm font-medium">Localidad de entrega</label>
                <Input placeholder="Localidad" value={form.localidad} onChange={(e) => setForm({ ...form, localidad: e.target.value })} />
              </div>
            )}

            <div>
              <label className="text-sm font-medium block mb-1">Artículos</label>
              <LineasEditor lineas={lineas} onChange={setLineas} productos={productos} condicion={form.condicionPago} controlarStock />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 items-start">
              <div>
                <label className="text-sm font-medium">Comentarios</label>
                <Textarea
                  placeholder="Observaciones de la venta (se imprimen en el comprobante y el remito)"
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

            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Registrando...' : 'Registrar Venta'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filtros */}
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por N° de venta o remito, cliente, DNI/CUIT, localidad, producto o comentario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Desde</label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Hasta</label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Modo de Entrega</label>
              <Select value={entregaFilter} onValueChange={setEntregaFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="retiro_local">Retiro en el local</SelectItem>
                  <SelectItem value="mercado_libre">Mercado Libre</SelectItem>
                  <SelectItem value="envio">Envío</SelectItem>
                </SelectContent>
              </Select>
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
                  <TableHead>N° Venta</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Entrega / Pago</TableHead>
                  <TableHead>Artículos</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVentas.map((v) => (
                  <TableRow key={v.id} className="hover:bg-orange-50/50 align-top">
                    <TableCell className="font-bold text-orange-600">{v.numero}</TableCell>
                    <TableCell>{fechaAR(v.fecha)}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{v.clienteNombre || v.dniCuit || '-'}</div>
                      {v.clienteNombre && v.dniCuit && <div className="text-gray-500">{v.dniCuit}</div>}
                      <div className="text-gray-500">{v.localidad || ''}</div>
                    </TableCell>
                    <TableCell className="text-sm space-y-1">
                      <div>{v.entrega ? ENTREGA_LABELS[v.entrega] : '-'}</div>
                      <Badge variant="outline" className={v.condicionPago === 'cuenta_corriente' ? 'border-blue-300 text-blue-700' : ''}>
                        {CONDICION_LABELS[v.condicionPago]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm max-w-xs">
                      {v.items.slice(0, 3).map(i => (
                        <div key={i.id} className="truncate">{qty(i.cantidad)} × <span className="text-orange-600">{getProductoNombre(i.productoId)}</span></div>
                      ))}
                      {v.items.length > 3 && <div className="text-gray-500">+{v.items.length - 3} más</div>}
                      {v.comentarios && <div className="text-xs italic text-gray-500 mt-1 line-clamp-2" title={v.comentarios}>“{v.comentarios}”</div>}
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-orange-600">{money(v.total)}</div>
                      {parseFloat(v.descuento) > 0 && <div className="text-xs text-gray-500">desc. {qty(v.descuento)}%</div>}
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      <Button
                        variant="outline" size="sm"
                        onClick={() => handleRemito(v)}
                        disabled={remitoMutation.isPending}
                        title={v.remitoNumero ? 'Reimprimir remito' : 'Generar e imprimir remito'}
                      >
                        <Truck className="w-4 h-4 mr-1" />
                        {v.remitoNumero ? `Remito N° ${v.remitoNumero}` : v.remito ? `Remito ${v.remito}*` : 'Generar remito'}
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => printHtml(htmlVenta(v, productos))}
                        className="text-gray-600 hover:text-gray-700 hover:bg-gray-100"
                        title="Imprimir comprobante de venta"
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleDelete(v)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-100"
                        title="Eliminar venta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredVentas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {ventas && ventas.length > 0 ? 'Ninguna venta coincide con los filtros' : 'No hay ventas registradas'}
            </div>
          )}
          {filteredVentas.some(v => !v.remitoNumero && v.remito) && (
            <p className="text-xs text-gray-500 mt-2">* Remito cargado a mano en la versión anterior del sistema.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
