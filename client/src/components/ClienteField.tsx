import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SearchSelect } from "@/components/SearchSelect";
import type { ClienteRow } from "@/lib/print";

export type NuevoClienteForm = {
  nombre: string;
  dni: string;
  telefono: string;
  direccion: string;
  tieneCuentaCorriente: boolean;
};

export const nuevoClienteVacio = (): NuevoClienteForm => ({
  nombre: "", dni: "", telefono: "", direccion: "", tieneCuentaCorriente: false,
});

/** Datos listos para enviar al servidor, o null si no se está creando un cliente. */
export function nuevoClienteParaEnviar(n: NuevoClienteForm | null) {
  return n ? { ...n, nombre: n.nombre.trim() } : null;
}

/**
 * Elegir un cliente existente o cargar uno nuevo en el momento.
 * El cliente nuevo queda guardado en la pestaña Clientes.
 */
export function ClienteField({
  clientes, clienteId, onClienteId, nuevo, onNuevo,
}: {
  clientes: ClienteRow[];
  clienteId: string;
  onClienteId: (id: string) => void;
  nuevo: NuevoClienteForm | null;
  onNuevo: (n: NuevoClienteForm | null) => void;
}) {
  if (nuevo) {
    const set = (cambios: Partial<NuevoClienteForm>) => onNuevo({ ...nuevo, ...cambios });
    return (
      <div className="border border-orange-200 rounded-lg p-3 bg-orange-50 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-orange-800">Nuevo cliente <span className="font-normal text-orange-700">(se guarda en Clientes)</span></p>
          <Button type="button" variant="ghost" size="sm" onClick={() => onNuevo(null)}>
            <Users className="w-4 h-4 mr-1" /> Usar cliente existente
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input placeholder="Nombre y apellido *" value={nuevo.nombre} onChange={e => set({ nombre: e.target.value })} required />
          <Input placeholder="DNI / CUIT" value={nuevo.dni} onChange={e => set({ dni: e.target.value })} />
          <Input placeholder="Teléfono de contacto" value={nuevo.telefono} onChange={e => set({ telefono: e.target.value })} />
          <Input placeholder="Dirección" value={nuevo.direccion} onChange={e => set({ direccion: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={nuevo.tieneCuentaCorriente} onCheckedChange={v => set({ tieneCuentaCorriente: v })} />
          Tiene cuenta corriente
        </label>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="flex-1 min-w-0">
        <SearchSelect
          value={clienteId}
          onChange={onClienteId}
          placeholder="Seleccionar cliente..."
          emptyText="No hay clientes que coincidan"
          options={[
            { value: "", label: "Sin cliente (consumidor final)" },
            ...clientes.map(c => ({
              value: String(c.id),
              label: c.nombre,
              search: `${c.dni ?? ""} ${c.telefono ?? ""}`,
              hint: [c.dni, c.tieneCuentaCorriente ? "Cuenta corriente" : null].filter(Boolean).join(" · ") || undefined,
            })),
          ]}
        />
      </div>
      <Button type="button" variant="outline" className="shrink-0 border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => onNuevo(nuevoClienteVacio())}>
        <UserPlus className="w-4 h-4 mr-1" /> Nuevo
      </Button>
    </div>
  );
}
