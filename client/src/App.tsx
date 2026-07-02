import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Insumos from "./pages/Insumos";
import Productos from "./pages/Productos";
import Recetas from "./pages/Recetas";
import Produccion from "./pages/Produccion";
import Ventas from "./pages/Ventas";
import Reportes from "./pages/Reportes";

function Router() {
  return (
    <Switch>
      <Route path="/" nest>
        <DashboardLayout>
          <Route path="/" component={Dashboard} />
          <Route path="/insumos" component={Insumos} />
          <Route path="/productos" component={Productos} />
          <Route path="/recetas" component={Recetas} />
          <Route path="/produccion" component={Produccion} />
          <Route path="/ventas" component={Ventas} />
          <Route path="/reportes" component={Reportes} />
        </DashboardLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
