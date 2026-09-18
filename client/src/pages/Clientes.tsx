import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit2, Trash2, Search, Wallet, Printer } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { fechaAR, hoy, money } from '@/lib/format';
import { htmlEstadoCuenta, printHtml, type ClienteRow } from '@/lib/print';

const formVacio = { nombre: '', dni: '', telefono: '', direccion: '', tieneCuentaCorriente: false };

export default function Clientes() {
  const [search, setSearch] = useState('');
  const [soloCuentaCorriente, setSoloCuentaCorriente] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(formVacio);
  const [cuentaDe, setCuentaDe] = useState<ClienteRow | null>(null);

  const utils = trpc.useUtils();
  const { data: clientes = [] } = trpc.clientes.list.useQuery();
  const createMutation = trpc.clientes.create.useMutation();
  const updateMutation = trpc.clientes.update.useMutation();
  const deleteMutation = trpc.clientes.delete.useMutation();

  const term = search.trim().toLowerCase();
  const filtrados = clientes.filter(c =>
    (!soloCuentaCorriente || c.tieneCuentaCorriente) &&
    (!term ||
      c.nombre.toLowerCase().includes(term) ||
      c.dni?.toLowerCase().includes(term) ||
      c.telefono?.toLowerCase().includes(term) ||
      c.direccion?.toLowerCase().includes(term))
  );

  const abrirNuevo = () => { setEditingId(null); setForm(formVacio); setOpen(true); };

  const abrirEditar = (c: ClienteRow) => {
    setEditingId(c.id);
    setForm({
      nombre: c.nombre,
      dni: c.dni ?? '',
      telefono: c.telefono ?? '',
      direccion: c.direccion ?? '',
      tieneCuentaCorriente: !!c.tieneCuentaCorriente,
    });
    setOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, ...form });
        toast.success('Cliente actualizado');
      } else {
        await createMutation.mutateAsync(form);
        toast.success('Cliente creado');
      }
      setOpen(false);
      await utils.clientes.list.invalidate();
    } catch (error: any) {
      toast.error(error?.message || 'Error al guardar');
    }
  };

  const handleDelete = async (c: ClienteRow) => {
    if (confirm(`¿Eliminar al cliente "${c.nombre}"?`)) {
      try {
        await deleteMutation.mutateAsync(c.id);
        toast.success('Cliente eliminado');
        await utils.clientes.list.invalidate();
      } catch (error: any) {
        toast.error(error?.message || 'Error al eliminar');
      }
    }
  };

  // El diálogo de cuenta corriente siempre muestra el saldo actualizado del listado.
  const cuentaActual = cuentaDe ? clientes.find(c => c.id === cuentaDe.id) ?? cuentaDe : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-600">Datos de contacto y cuentas corrientes</p>
        </div>
        <Button className="bg-orange-600 hover:bg-orange-700" onClick={abrirNuevo}>
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Cliente
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar' : 'Nuevo'} Cliente</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modificá los datos del cliente' : 'Ingresá los datos del nuevo cliente'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Nombre y apellido</label>
              <Input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">DNI</label>
                <Input value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} />
              </div>
              <div>
                <label className="text-sm font-medium">Teléfono de contacto</label>
                <Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Dirección</label>
              <Input value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })} />
            </div>
            <label className="flex items-center gap-3 rounded-md border p-3 cursor-pointer">
              <Switch checked={form.tieneCuentaCorriente} onCheckedChange={(v) => setForm({ ...form, tieneCuentaCorriente: v })} />
              <div>
                <div className="text-sm font-medium">Tiene cuenta corriente</div>
                <div className="text-xs text-gray-500">Permite venderle a cuenta corriente y registrar sus pagos</div>
              </div>
            </label>
            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
              {editingId ? 'Actualizar' : 'Crear'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, DNI, teléfono o dirección..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer w-fit">
            <Switch checked={soloCuentaCorriente} onCheckedChange={setSoloCuentaCorriente} />
            Solo clientes con cuenta corriente
          </label>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="max-h-[60vh] overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="sticky top-0 z-10 bg-orange-50 hover:bg-orange-50">
                  <TableHead>Nombre y apellido</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Cuenta corriente</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map(c => (
                  <TableRow key={c.id} className="hover:bg-orange-50/50">
                    <TableCell className="font-medium text-orange-600">{c.nombre}</TableCell>
                    <TableCell>{c.dni || '-'}</TableCell>
                    <TableCell>{c.telefono || '-'}</TableCell>
                    <TableCell>{c.direccion || '-'}</TableCell>
                    <TableCell>
                      {c.tieneCuentaCorriente ? (
                        <div className="space-y-1">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">Sí</Badge>
                          <div className={`text-sm font-semibold ${c.saldo > 0 ? 'text-red-600' : 'text-green-700'}`}>
                            Saldo {money(c.saldo)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">No</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-1 whitespace-nowrap">
                      {c.tieneCuentaCorriente ? (
                        <Button variant="outline" size="sm" onClick={() => setCuentaDe(c)}>
                          <Wallet className="w-4 h-4 mr-1" /> Cta. Cte.
                        </Button>
                      ) : null}
                      <Button variant="ghost" size="sm" onClick={() => abrirEditar(c)} className="text-orange-600 hover:text-orange-700 hover:bg-orange-100">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(c)} className="text-red-600 hover:text-red-700 hover:bg-red-100">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filtrados.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {clientes.length > 0 ? 'Ningún cliente coincide con la búsqueda' : 'No hay clientes registrados'}
            </div>
          )}
        </CardContent>
      </Card>

      <CuentaCorrienteDialog cliente={cuentaActual} onClose={() => setCuentaDe(null)} />
    </div>
  );
}

function CuentaCorrienteDialog({ cliente, onClose }: { cliente: ClienteRow | null; onClose: () => void }) {
  const [pago, setPago] = useState({ fecha: hoy(), monto: '', concepto: '' });
  const utils = trpc.useUtils();
  const { data: movimientos = [] } = trpc.cuentaCorriente.movimientos.useQuery(cliente?.id ?? 0, { enabled: !!cliente });
  const pagoMutation = trpc.cuentaCorriente.registrarPago.useMutation();
  const borrarMutation = trpc.cuentaCorriente.eliminarMovimiento.useMutation();

  const refrescar = () => Promise.all([
    utils.cuentaCorriente.movimientos.invalidate(),
    utils.clientes.list.invalidate(),
  ]);

  const registrarPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return;
    try {
      await pagoMutation.mutateAsync({
        clienteId: cliente.id,
        fecha: pago.fecha,
        monto: parseFloat(pago.monto),
        concepto: pago.concepto,
      });
      toast.success('Pago registrado');
      setPago({ fecha: hoy(), monto: '', concepto: '' });
      await refrescar();
    } catch (error: any) {
      toast.error(error?.message || 'Error al registrar el pago');
    }
  };

  const borrarPago = async (id: number) => {
    if (!confirm('¿Eliminar este pago? El saldo del cliente volverá a subir.')) return;
    try {
      await borrarMutation.mutateAsync(id);
      await refrescar();
    } catch (error: any) {
      toast.error(error?.message || 'Error al eliminar');
    }
  };

  return (
    <Dialog open={!!cliente} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cuenta corriente — {cliente?.nombre}</DialogTitle>
          <DialogDescription>
            Las ventas a cuenta corriente suman al saldo; los pagos lo reducen.
          </DialogDescription>
        </DialogHeader>
        {cliente && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-orange-50 border border-orange-200 p-4">
              <div>
                <div className="text-sm text-gray-600">Saldo actual (deuda del cliente)</div>
                <div className={`text-3xl font-bold ${cliente.saldo > 0 ? 'text-red-600' : 'text-green-700'}`}>{money(cliente.saldo)}</div>
              </div>
              <Button variant="outline" onClick={() => printHtml(htmlEstadoCuenta(cliente, movimientos))} disabled={movimientos.length === 0}>
                <Printer className="w-4 h-4 mr-2" /> Imprimir estado de cuenta
              </Button>
            </div>

            <form onSubmit={registrarPago} className="grid grid-cols-1 sm:grid-cols-[150px_150px_1fr_auto] gap-2 items-end">
              <div>
                <label className="text-xs font-medium text-gray-500">Fecha del pago</label>
                <Input type="date" value={pago.fecha} onChange={(e) => setPago({ ...pago, fecha: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Monto</label>
                <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={pago.monto} onChange={(e) => setPago({ ...pago, monto: e.target.value })} required />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Concepto</label>
                <Input placeholder="Efectivo, transferencia..." value={pago.concepto} onChange={(e) => setPago({ ...pago, concepto: e.target.value })} />
              </div>
              <Button type="submit" className="bg-orange-600 hover:bg-orange-700" disabled={pagoMutation.isPending}>Registrar pago</Button>
            </form>

            <div className="max-h-[40vh] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="sticky top-0 bg-orange-50 hover:bg-orange-50">
                    <TableHead>Fecha</TableHead>
                    <TableHead>Concepto</TableHead>
                    <TableHead className="text-right">Cargo</TableHead>
                    <TableHead className="text-right">Pago</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.map(m => (
                    <TableRow key={m.id}>
                      <TableCell>{fechaAR(m.fecha)}</TableCell>
                      <TableCell>{m.concepto}</TableCell>
                      <TableCell className="text-right text-red-600">{m.tipo === 'cargo' ? money(m.monto) : ''}</TableCell>
                      <TableCell className="text-right text-green-700">{m.tipo === 'pago' ? money(m.monto) : ''}</TableCell>
                      <TableCell className="text-right font-semibold">{money(m.saldoAcumulado)}</TableCell>
                      <TableCell className="text-right">
                        {m.tipo === 'pago' && (
                          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => borrarPago(m.id)} title="Eliminar pago">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {movimientos.length === 0 && <div className="text-center py-6 text-gray-500">Sin movimientos</div>}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
