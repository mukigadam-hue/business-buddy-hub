import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { BusinessProvider, useBusiness } from "@/context/BusinessContext";
import { FactoryProvider } from "@/context/FactoryContext";
import { PropertyProvider } from "@/context/PropertyContext";
import AppLayout from "@/components/AppLayout";
import AuthPage from "./pages/AuthPage";
import BusinessSetupPage from "./pages/BusinessSetupPage";

// Lazy-load all page components for faster initial load
const Dashboard = lazy(() => import("./pages/Dashboard"));
const StockPage = lazy(() => import("./pages/StockPage"));
const SalesPage = lazy(() => import("./pages/SalesPage"));
const PurchasesPage = lazy(() => import("./pages/PurchasesPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TeamPage = lazy(() => import("./pages/TeamPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const BusinessExpenses = lazy(() => import("./pages/BusinessExpenses"));
const DiscoverPage = lazy(() => import("./pages/DiscoverPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const WastePage = lazy(() => import("./pages/WastePage"));

// Factory pages
const FactoryDashboard = lazy(() => import("./pages/factory/FactoryDashboard"));
const FactoryInputStock = lazy(() => import("./pages/factory/FactoryInputStock"));
const FactoryProductStock = lazy(() => import("./pages/factory/FactoryProductStock"));
const FactoryPurchases = lazy(() => import("./pages/factory/FactoryPurchases"));
const FactorySales = lazy(() => import("./pages/factory/FactorySales"));
const FactoryTeam = lazy(() => import("./pages/factory/FactoryTeam"));
const FactoryExpenses = lazy(() => import("./pages/factory/FactoryExpenses"));
const FactoryServices = lazy(() => import("./pages/factory/FactoryServices"));
const FactoryProduction = lazy(() => import("./pages/factory/FactoryProduction"));

// Property pages
const PropertyDashboard = lazy(() => import("./pages/property/PropertyDashboard"));
const PropertyAssets = lazy(() => import("./pages/property/PropertyAssets"));
const PropertyBookings = lazy(() => import("./pages/property/PropertyBookings"));
// PropertyMessages removed - communication integrated into Bookings
const PropertyBrowse = lazy(() => import("./pages/property/PropertyBrowse"));
const PropertySettings = lazy(() => import("./pages/property/PropertySettings"));
const PropertyTeam = lazy(() => import("./pages/property/PropertyTeam"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="text-center space-y-2">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="text-4xl">📦</div>
          <p className="text-muted-foreground">Loading Business Manager...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  return (
    <BusinessProvider>
      <BrowserRouter>
        <BusinessContent />
      </BrowserRouter>
    </BusinessProvider>
  );
}

function BusinessContent() {
  const { currentBusiness, loading } = useBusiness();
  const navigate = useNavigate();

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

  const isFactory = currentBusiness.business_type === 'factory';
  const isProperty = currentBusiness.business_type === 'property';

  if (isProperty) {
    return (
      <PropertyProvider key={currentBusiness.id}>
        <AppLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<PropertyDashboard />} />
              <Route path="/assets" element={<PropertyAssets />} />
              <Route path="/bookings" element={<PropertyBookings />} />
              {/* Messages removed - integrated into Bookings */}
              <Route path="/browse" element={<PropertyBrowse />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/team" element={<PropertyTeam />} />
              <Route path="/settings" element={<PropertySettings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </PropertyProvider>
    );
  }

  if (isFactory) {
    return (
      <FactoryProvider key={currentBusiness.id}>
        <AppLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<FactoryDashboard />} />
              <Route path="/input-stock" element={<FactoryInputStock />} />
              <Route path="/product-stock" element={<FactoryProductStock />} />
              <Route path="/production" element={<FactoryProduction />} />
              <Route path="/sales" element={<FactorySales />} />
              <Route path="/purchases" element={<FactoryPurchases />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/services" element={<FactoryServices />} />
              <Route path="/expenses" element={<FactoryExpenses />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/discover" element={<DiscoverPage />} />
              <Route path="/team" element={<FactoryTeam />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </FactoryProvider>
    );
  }

  return (
    <AppLayout key={currentBusiness.id}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/sales" element={<SalesPage />} />
          <Route path="/purchases" element={<PurchasesPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/contacts" element={<ContactsPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/expenses" element={<BusinessExpenses />} />
          <Route path="/waste" element={<WastePage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </AppLayout>
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
