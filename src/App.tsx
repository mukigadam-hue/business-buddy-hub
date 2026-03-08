import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BusinessProvider, useBusiness } from "@/context/BusinessContext";
import { FactoryProvider } from "@/context/FactoryContext";
import AppLayout from "@/components/AppLayout";
import AuthPage from "./pages/AuthPage";
import BusinessSetupPage from "./pages/BusinessSetupPage";
import Dashboard from "./pages/Dashboard";
import StockPage from "./pages/StockPage";
import SalesPage from "./pages/SalesPage";
import PurchasesPage from "./pages/PurchasesPage";
import OrdersPage from "./pages/OrdersPage";
import ServicesPage from "./pages/ServicesPage";
import SettingsPage from "./pages/SettingsPage";
import TeamPage from "./pages/TeamPage";
import NotFound from "./pages/NotFound";
import ContactsPage from "./pages/ContactsPage";

import PaymentVerificationPage from "./pages/PaymentVerificationPage";

// Factory pages
import FactoryDashboard from "./pages/factory/FactoryDashboard";
import FactoryInputStock from "./pages/factory/FactoryInputStock";
import FactoryProductStock from "./pages/factory/FactoryProductStock";
import FactoryPurchases from "./pages/factory/FactoryPurchases";
import FactorySales from "./pages/factory/FactorySales";
import FactoryTeam from "./pages/factory/FactoryTeam";
import FactoryExpenses from "./pages/factory/FactoryExpenses";
import FactoryServices from "./pages/factory/FactoryServices";
import FactoryProduction from "./pages/factory/FactoryProduction";

const queryClient = new QueryClient();

function AppContent() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="text-4xl">📦</div>
          <p className="text-muted-foreground">Loading BizTrack...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <BusinessProvider>
      <BusinessContent />
    </BusinessProvider>
  );
}

function BusinessContent() {
  const { currentBusiness, loading } = useBusiness();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="text-4xl">📦</div>
          <p className="text-muted-foreground">Loading your business...</p>
        </div>
      </div>
    );
  }

  if (!currentBusiness) return <BusinessSetupPage />;

  const isFactory = (currentBusiness as any).business_type === 'factory';

  if (isFactory) {
    return (
      <FactoryProvider>
        <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<FactoryDashboard />} />
              <Route path="/input-stock" element={<FactoryInputStock />} />
              <Route path="/product-stock" element={<FactoryProductStock />} />
              <Route path="/production" element={<FactoryProduction />} />
              <Route path="/sales" element={<FactorySales />} />
              <Route path="/purchases" element={<FactoryPurchases />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/payments" element={<PaymentVerificationPage />} />
              <Route path="/services" element={<FactoryServices />} />
              <Route path="/expenses" element={<FactoryExpenses />} />
              <Route path="/team" element={<FactoryTeam />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
        </BrowserRouter>
      </FactoryProvider>
    );
  }

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          
          <Route path="/payments" element={<PaymentVerificationPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
