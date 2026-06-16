import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminLanguageProvider } from "@/contexts/AdminLanguageContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AppLayout } from "@/components/AppLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Events from "./pages/Events";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import EventDetails from "./pages/EventDetails";
import Settings from "./pages/Settings";
import Admin from "./pages/Admin";
import CreateInstitution from "./pages/CreateInstitution";
import EditInstitution from "./pages/EditInstitution";
import AdminChats from "./pages/AdminChats";
import UpdatePassword from "./pages/UpdatePassword";
import ResetPassword from "./pages/ResetPassword";
import PendingApproval from "./pages/PendingApproval";
import Notifications from "./pages/Notifications";
import DataRetention from "./pages/admin/DataRetention";
import BankStatement from "./pages/BankStatement";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AdminLanguageProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/update-password" element={<UpdatePassword />} />
            <Route path="/auth/reset-password" element={<ResetPassword />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/events"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Events />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/new"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <CreateEvent />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:id/edit"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <EditEvent />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/events/:id"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <EventDetails />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AppLayout>
                    <Admin />
                  </AppLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/institutions/new"
              element={
                <AdminRoute>
                  <AppLayout>
                    <CreateInstitution />
                  </AppLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/institutions/:id/edit"
              element={
                <AdminRoute>
                  <AppLayout>
                    <EditInstitution />
                  </AppLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/chats"
              element={
                <AdminRoute>
                  <AppLayout>
                    <AdminChats />
                  </AppLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/admin/data-retention"
              element={
                <AdminRoute>
                  <AppLayout>
                    <DataRetention />
                  </AppLayout>
                </AdminRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <AdminRoute>
                  <AppLayout>
                    <Notifications />
                  </AppLayout>
                </AdminRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AdminLanguageProvider>
  </QueryClientProvider>
);

export default App;
