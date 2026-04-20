import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './components/ui/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute, { RoleRoute } from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import AppointmentsPage from './pages/AppointmentsPage';
import ServicesPage from './pages/ServicesPage';
import StaffPage from './pages/StaffPage';
import BillingPage from './pages/BillingPage';
import LoyaltyPage from './pages/LoyaltyPage';
import CommunicationsPage from './pages/CommunicationsPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';
import ExpensesPage from './pages/ExpensesPage';
import CampaignsPage from './pages/CampaignsPage';
import PublicBookingPage from './pages/PublicBookingPage';
import PublicFeedbackPage from './pages/PublicFeedbackPage';
import MembershipPage from './pages/MembershipPage';
import ProductsPage from './pages/ProductsPage';
import QueuePage from './pages/QueuePage';
import CommissionsPage from './pages/CommissionsPage';
import WalletPage from './pages/WalletPage';
import HappyHoursPage from './pages/HappyHoursPage';
import ReferralsPage from './pages/ReferralsPage';
import VerifyOtpPage from './pages/VerifyOtpPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <ErrorBoundary>
    <AuthProvider>
      <ToastProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/book" element={<PublicBookingPage />} />
          <Route path="/feedback/:appointmentId" element={<PublicFeedbackPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="queue" element={<QueuePage />} />

              {/* Admin + Receptionist */}
              <Route element={<RoleRoute roles={['admin', 'receptionist']} />}>
                <Route path="customers" element={<CustomersPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route path="billing" element={<BillingPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="communications" element={<CommunicationsPage />} />
                <Route path="wallet" element={<WalletPage />} />
              </Route>

              {/* Admin only */}
              <Route element={<RoleRoute roles={['admin']} />}>
                <Route path="staff" element={<StaffPage />} />
                <Route path="expenses" element={<ExpensesPage />} />
                <Route path="loyalty" element={<LoyaltyPage />} />
                <Route path="campaigns" element={<CampaignsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="memberships" element={<MembershipPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="commissions" element={<CommissionsPage />} />
                <Route path="happy-hours" element={<HappyHoursPage />} />
                <Route path="referrals" element={<ReferralsPage />} />
              </Route>
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}
