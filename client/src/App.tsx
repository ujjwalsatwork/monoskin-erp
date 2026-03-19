import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

function ToastBridge() {
  const { toast } = useToast();
  useEffect(() => {
    (window as any).__showToast = toast;
    return () => { delete (window as any).__showToast; };
  }, [toast]);
  return null;
}

// Pages
import SignIn from "./pages/SignIn";
import Dashboard from "./pages/Dashboard";
import Approvals from "./pages/Approvals";
import Leads from "./pages/Leads";
import LeadsDedupe from "./pages/LeadsDedupe";
import Doctors from "./pages/Doctors";
import Pharmacies from "./pages/Pharmacies";
import Orders from "./pages/Orders";
import OrderCreate from "./pages/OrderCreate";
import OrderExceptions from "./pages/OrderExceptions";
import CustomerStatements from "./pages/CustomerStatements";
import Inventory from "./pages/Inventory";
import NearExpiry from "./pages/NearExpiry";
import StockMovements from "./pages/StockMovements";
import Warehouses from "./pages/Warehouses";
import WarehouseOps from "./pages/WarehouseOps";
import WarehouseDetail from "./pages/WarehouseDetail";
import GRN from "./pages/GRN";
import GRNDetail from "./pages/GRNDetail";
import Transfers from "./pages/Transfers";
import TransferDetail from "./pages/TransferDetail";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import PricingSlabs from "./pages/PricingSlabs";
import Schemes from "./pages/Schemes";
import PromoCodes from "./pages/PromoCodes";
import ClinicCodes from "./pages/ClinicCodes";
import LogisticsDashboard from "./pages/LogisticsDashboard";
import Shipments from "./pages/Shipments";
import Returns from "./pages/Returns";
import ReturnDetail from "./pages/ReturnDetail";
import Finance from "./pages/Finance";
import Invoices from "./pages/Invoices";
import CreditNotes from "./pages/CreditNotes";
import ARAgeing from "./pages/ARAgeing";
import Receipts from "./pages/Receipts";
import GSTReports from "./pages/GSTReports";
import MRDirectory from "./pages/MRDirectory";
import MRProfile from "./pages/MRProfile";
import MRWorkReports from "./pages/MRWorkReports";
import MRTargets from "./pages/MRTargets";
import Employees from "./pages/Employees";
import EmployeeProfile from "./pages/EmployeeProfile";
import Attendance from "./pages/Attendance";
import LeaveManagement from "./pages/LeaveManagement";
import Compliance from "./pages/Compliance";
import EmployeeLifecycle from "./pages/EmployeeLifecycle";
import Payroll from "./pages/Payroll";
import HolidayCalendar from "./pages/HolidayCalendar";
import AuditLogs from "./pages/AuditLogs";
import AccessLogs from "./pages/AccessLogs";
import DataMasking from "./pages/DataMasking";
import ExportControls from "./pages/ExportControls";
import UsersRoles from "./pages/UsersRoles";
import Territories from "./pages/Territories";
import TaxHSN from "./pages/TaxHSN";
import ImportExport from "./pages/ImportExport";
import Reports from "./pages/Reports";
import CustomReports from "./pages/CustomReports";
import SalesAnalytics from "./pages/SalesAnalytics";
import Integrations from "./pages/Integrations";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import LeadDetail from "./pages/LeadDetail";
import DoctorDetail from "./pages/DoctorDetail";
import PharmacyDetail from "./pages/PharmacyDetail";
import OrderDetail from "./pages/OrderDetail";
import ShipmentDetail from "./pages/ShipmentDetail";
import InvoiceDetail from "./pages/InvoiceDetail";
import { RouteGuard } from "./components/shared/RouteGuard";

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return (
    <AppLayout>
      <Routes>
        {/* Dashboard - accessible to all authenticated users */}
        <Route path="/" element={<RouteGuard><Dashboard /></RouteGuard>} />
              
              {/* Approvals */}
              <Route path="/approvals" element={<RouteGuard><Approvals /></RouteGuard>} />
              
              {/* Leads & CRM */}
              <Route path="/leads" element={<RouteGuard><Leads /></RouteGuard>} />
              <Route path="/leads/:id" element={<RouteGuard><LeadDetail /></RouteGuard>} />
              <Route path="/leads/dedupe" element={<RouteGuard><LeadsDedupe /></RouteGuard>} />
              
              {/* MR Management */}
              <Route path="/mr" element={<RouteGuard><MRDirectory /></RouteGuard>} />
              <Route path="/mr/:id" element={<RouteGuard><MRProfile /></RouteGuard>} />
              <Route path="/mr/reports" element={<RouteGuard><MRWorkReports /></RouteGuard>} />
              <Route path="/mr/targets" element={<RouteGuard><MRTargets /></RouteGuard>} />
              
              {/* Doctors & Pharmacies */}
              <Route path="/doctors" element={<RouteGuard><Doctors /></RouteGuard>} />
              <Route path="/doctors/:id" element={<RouteGuard><DoctorDetail /></RouteGuard>} />
              <Route path="/pharmacies" element={<RouteGuard><Pharmacies /></RouteGuard>} />
              <Route path="/pharmacies/:id" element={<RouteGuard><PharmacyDetail /></RouteGuard>} />
              
              {/* Orders */}
              <Route path="/orders" element={<RouteGuard><Orders /></RouteGuard>} />
              <Route path="/orders/:id" element={<RouteGuard><OrderDetail /></RouteGuard>} />
              <Route path="/orders/create" element={<RouteGuard><OrderCreate /></RouteGuard>} />
              <Route path="/orders/exceptions" element={<RouteGuard><OrderExceptions /></RouteGuard>} />
              <Route path="/orders/statements" element={<RouteGuard><CustomerStatements /></RouteGuard>} />
              
              {/* Inventory */}
              <Route path="/inventory" element={<RouteGuard><Inventory /></RouteGuard>} />
              <Route path="/inventory/near-expiry" element={<RouteGuard><NearExpiry /></RouteGuard>} />
              <Route path="/inventory/movements" element={<RouteGuard><StockMovements /></RouteGuard>} />
              
              {/* Warehouses */}
              <Route path="/warehouses" element={<RouteGuard><Warehouses /></RouteGuard>} />
              <Route path="/warehouses/:id" element={<RouteGuard><WarehouseDetail /></RouteGuard>} />
              <Route path="/warehouses/grn" element={<RouteGuard><GRN /></RouteGuard>} />
              <Route path="/warehouses/grn/:id" element={<RouteGuard><GRNDetail /></RouteGuard>} />
              <Route path="/warehouses/transfers" element={<RouteGuard><Transfers /></RouteGuard>} />
              <Route path="/warehouses/transfers/:id" element={<RouteGuard><TransferDetail /></RouteGuard>} />
              <Route path="/warehouses/ops" element={<RouteGuard><WarehouseOps /></RouteGuard>} />
              
              {/* Products & Pricing */}
              <Route path="/products" element={<RouteGuard><Products /></RouteGuard>} />
              <Route path="/products/:id" element={<RouteGuard><ProductDetail /></RouteGuard>} />
              <Route path="/products/pricing" element={<RouteGuard><PricingSlabs /></RouteGuard>} />
              <Route path="/products/schemes" element={<RouteGuard><Schemes /></RouteGuard>} />
              <Route path="/products/promo-codes" element={<RouteGuard><PromoCodes /></RouteGuard>} />
              <Route path="/products/clinic-codes" element={<RouteGuard><ClinicCodes /></RouteGuard>} />
              
              {/* Logistics */}
              <Route path="/logistics" element={<RouteGuard><LogisticsDashboard /></RouteGuard>} />
              <Route path="/shipments" element={<RouteGuard><Shipments /></RouteGuard>} />
              <Route path="/shipments/:id" element={<RouteGuard><ShipmentDetail /></RouteGuard>} />
              <Route path="/returns" element={<RouteGuard><Returns /></RouteGuard>} />
              <Route path="/returns/:id" element={<RouteGuard><ReturnDetail /></RouteGuard>} />
              
              {/* Finance */}
              <Route path="/finance" element={<RouteGuard><Finance /></RouteGuard>} />
              <Route path="/finance/invoices" element={<RouteGuard><Invoices /></RouteGuard>} />
              <Route path="/finance/invoices/:id" element={<RouteGuard><InvoiceDetail /></RouteGuard>} />
              <Route path="/finance/credit-notes" element={<RouteGuard><CreditNotes /></RouteGuard>} />
              <Route path="/finance/ar-ageing" element={<RouteGuard><ARAgeing /></RouteGuard>} />
              <Route path="/finance/receipts" element={<RouteGuard><Receipts /></RouteGuard>} />
              <Route path="/finance/gst" element={<RouteGuard><GSTReports /></RouteGuard>} />
              
              {/* HR & Compliance */}
              <Route path="/hr/employees" element={<RouteGuard><Employees /></RouteGuard>} />
              <Route path="/hr/employees/:id" element={<RouteGuard><EmployeeProfile /></RouteGuard>} />
              <Route path="/hr/attendance" element={<RouteGuard><Attendance /></RouteGuard>} />
              <Route path="/hr/leave" element={<RouteGuard><LeaveManagement /></RouteGuard>} />
              <Route path="/hr/compliance" element={<RouteGuard><Compliance /></RouteGuard>} />
              <Route path="/hr/lifecycle" element={<RouteGuard><EmployeeLifecycle /></RouteGuard>} />
              <Route path="/hr/payroll" element={<RouteGuard><Payroll /></RouteGuard>} />
              <Route path="/hr/holiday-calendar" element={<RouteGuard><HolidayCalendar /></RouteGuard>} />
              
              {/* Security */}
              <Route path="/security/audit-logs" element={<RouteGuard><AuditLogs /></RouteGuard>} />
              <Route path="/security/access-logs" element={<RouteGuard><AccessLogs /></RouteGuard>} />
              <Route path="/security/data-masking" element={<RouteGuard><DataMasking /></RouteGuard>} />
              <Route path="/security/export-controls" element={<RouteGuard><ExportControls /></RouteGuard>} />
              
              {/* Master Data */}
              <Route path="/master/users" element={<RouteGuard><UsersRoles /></RouteGuard>} />
              <Route path="/master/territories" element={<RouteGuard><Territories /></RouteGuard>} />
              <Route path="/master/tax" element={<RouteGuard><TaxHSN /></RouteGuard>} />
              <Route path="/master/import-export" element={<RouteGuard><ImportExport /></RouteGuard>} />
              
              {/* Reports & Analytics */}
              <Route path="/reports" element={<RouteGuard><Reports /></RouteGuard>} />
              <Route path="/reports/custom" element={<RouteGuard><CustomReports /></RouteGuard>} />
              <Route path="/reports/analytics" element={<RouteGuard><SalesAnalytics /></RouteGuard>} />
              
              {/* Other */}
              <Route path="/integrations" element={<RouteGuard><Integrations /></RouteGuard>} />
              <Route path="/settings" element={<RouteGuard><Settings /></RouteGuard>} />
              
        {/* Unauthorized */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ToastBridge />
        <BrowserRouter>
          <AuthenticatedApp />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
