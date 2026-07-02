import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Download } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';

const meses = [
  { num: 1, nombre: 'Enero' },
  { num: 2, nombre: 'Febrero' },
  { num: 3, nombre: 'Marzo' },
  { num: 4, nombre: 'Abril' },
  { num: 5, nombre: 'Mayo' },
  { num: 6, nombre: 'Junio' },
  { num: 7, nombre: 'Julio' },
  { num: 8, nombre: 'Agosto' },
  { num: 9, nombre: 'Septiembre' },
  { num: 10, nombre: 'Octubre' },
  { num: 11, nombre: 'Noviembre' },
  { num: 12, nombre: 'Diciembre' },
];

const añosDisponibles = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

export default function Reportes() {
  const [mesSeleccionado, setMesSeleccionado] = useState<string>((new Date().getMonth() + 1).toString());
  const [añoSeleccionado, setAñoSeleccionado] = useState<string>(new Date().getFullYear().toString());
  const [generandoVentas, setGenerandoVentas] = useState(false);
  const [generandoStock, setGenerandoStock] = useState(false);

  const ventasQuery = trpc.reportes.ventasMensuales.useQuery(
    { mes: parseInt(mesSeleccionado), año: parseInt(añoSeleccionado) },
    { enabled: false }
  );
  const stockQuery = trpc.reportes.stockMensual.useQuery(undefined, { enabled: false });

  const handleGenerarVentas = async () => {
    setGenerandoVentas(true);
    try {
      const html = await ventasQuery.refetch();
      if (html.data) {
        const blob = new Blob([html.data], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const nombreMes = meses.find(m => m.num === parseInt(mesSeleccionado))?.nombre || 'Mes';
        a.download = `informe-ventas-${nombreMes}-${añoSeleccionado}.html`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Informe de ventas generado');
      }
    } catch (error) {
      toast.error('Error al generar informe');
    } finally {
      setGenerandoVentas(false);
    }
  };

  const handleGenerarStock = async () => {
    setGenerandoStock(true);
    try {
      const html = await stockQuery.refetch();
      if (html.data) {
        const blob = new Blob([html.data], { type: 'text/html' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `informe-stock-${new Date().toLocaleDateString('es-AR')}.html`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Informe de stock generado');
      }
    } catch (error) {
      toast.error('Error al generar informe');
    } finally {
      setGenerandoStock(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-600">Genera informes mensuales de ventas y stock</p>
      </div>

      {/* Informe de Ventas */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <FileText className="w-5 h-5" />
            Informe de Ventas Mensual
          </CardTitle>
          <CardDescription>
            Genera un informe detallado de todas las ventas del mes seleccionado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Mes</label>
              <Select value={mesSeleccionado} onValueChange={setMesSeleccionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meses.map(m => (
                    <SelectItem key={m.num} value={m.num.toString()}>
                      {m.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Año</label>
              <Select value={añoSeleccionado} onValueChange={setAñoSeleccionado}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {añosDisponibles.map(a => (
                    <SelectItem key={a} value={a.toString()}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            onClick={handleGenerarVentas}
            disabled={generandoVentas}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Download className="w-4 h-4 mr-2" />
            {generandoVentas ? 'Generando...' : 'Descargar Informe de Ventas'}
          </Button>
        </CardContent>
      </Card>

      {/* Informe de Stock */}
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <FileText className="w-5 h-5" />
            Informe de Stock
          </CardTitle>
          <CardDescription>
            Genera un informe del estado actual del stock de productos e insumos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGenerarStock}
            disabled={generandoStock}
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            <Download className="w-4 h-4 mr-2" />
            {generandoStock ? 'Generando...' : 'Descargar Informe de Stock'}
          </Button>
        </CardContent>
      </Card>

      {/* Información */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Información</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>• Los informes se generan en formato HTML que puede ser impreso como PDF desde el navegador</p>
          <p>• Para convertir a PDF: abre el archivo HTML y usa Imprimir (Ctrl+P) → Guardar como PDF</p>
          <p>• Los informes incluyen todos los datos del período seleccionado</p>
        </CardContent>
      </Card>
    </div>
  );
}
