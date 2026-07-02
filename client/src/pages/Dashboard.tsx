import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertTriangle, TrendingUp, Package, DollarSign } from 'lucide-react';
import { trpc } from '@/lib/trpc';

const COLORS = ['#ff8c42', '#ff7a3d', '#ff6b35', '#ff5c2e', '#ff4d27'];

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery();
  const { data: stockBajo } = trpc.dashboard.stockBajo.useQuery();
  const { data: insumosBajo } = trpc.dashboard.insumosBajo.useQuery();
  const { data: ventas } = trpc.ventas.list.useQuery();
  const { data: productos } = trpc.productos.list.useQuery();

  const [ventasPorProducto, setVentasPorProducto] = useState<any[]>([]);

  useEffect(() => {
    if (ventas && productos) {
      const porProducto: Record<string, { nombre: string; cantidad: number; total: number }> = {};
      
      ventas.forEach((v: any) => {
        const producto = productos.find((p: any) => p.id === v.productoId);
        const nombre = producto?.nombre || `Producto ${v.productoId}`;
        
        if (!porProducto[v.productoId]) {
          porProducto[v.productoId] = { nombre, cantidad: 0, total: 0 };
        }
        porProducto[v.productoId].cantidad += parseFloat(v.cantidad?.toString() || '0');
        porProducto[v.productoId].total += parseFloat(v.total?.toString() || '0');
      });

      const datos = Object.entries(porProducto)
        .map(([_, data]) => data)
        .sort((a, b) => b.total - a.total);
      
      setVentasPorProducto(datos);
    }
  }, [ventas, productos]);

  const totalVentas = stats?.totalVentas || 0;
  const totalUnidades = stats?.totalUnidades || 0;
  const maVendido = stats?.maVendido;
  const menosVendido = stats?.menosVendido;

  const alertas = [
    ...(stockBajo?.map((p: any) => ({
      tipo: 'Stock Bajo',
      item: p.nombre,
      cantidad: p.stock,
      unidad: 'unidades',
      color: 'bg-orange-100 text-orange-800',
    })) || []),
    ...(insumosBajo?.map((i: any) => ({
      tipo: 'Insumo Bajo',
      item: i.descripcion,
      cantidad: i.cantidad,
      unidad: i.unidad,
      color: 'bg-red-100 text-red-800',
    })) || []),
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Ventas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">${totalVentas.toFixed(2)}</div>
            <p className="text-xs text-gray-500 mt-1">Ventas del período</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Unidades Vendidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalUnidades.toFixed(0)}</div>
            <p className="text-xs text-gray-500 mt-1">Productos vendidos</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Más Vendido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-orange-600 truncate">{maVendido?.nombre || '-'}</div>
            <p className="text-xs text-gray-500 mt-1">{maVendido?.cantidad.toFixed(0) || 0} uds · ${maVendido?.total.toFixed(2) || '0.00'}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Menos Vendido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-orange-600 truncate">{menosVendido?.nombre || '-'}</div>
            <p className="text-xs text-gray-500 mt-1">{menosVendido?.cantidad.toFixed(0) || 0} uds · ${menosVendido?.total.toFixed(2) || '0.00'}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertas.map((alerta, idx) => (
                <div key={idx} className={`p-3 rounded ${alerta.color}`}>
                  <div className="font-semibold">{alerta.tipo}: {alerta.item}</div>
                  <div className="text-sm">Cantidad: {parseFloat(alerta.cantidad?.toString() || '0').toFixed(2)} {alerta.unidad}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <Tabs defaultValue="ranking" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ranking">Ranking de Ventas</TabsTrigger>
          <TabsTrigger value="distribucion">Distribución</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventas por Producto</CardTitle>
              <CardDescription>Top productos por monto vendido</CardDescription>
            </CardHeader>
            <CardContent>
              {ventasPorProducto.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={ventasPorProducto}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#ff8c42" name="Monto ($)" />
                    <Bar dataKey="cantidad" fill="#ffb380" name="Cantidad" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">Sin datos de ventas</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribucion" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Ventas</CardTitle>
              <CardDescription>Proporción de ventas por producto</CardDescription>
            </CardHeader>
            <CardContent>
              {ventasPorProducto.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={ventasPorProducto}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ nombre, total }) => `${nombre}: $${total.toFixed(0)}`}
                      outerRadius={80}
                      fill="#ff8c42"
                      dataKey="total"
                    >
                      {ventasPorProducto.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">Sin datos de ventas</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
