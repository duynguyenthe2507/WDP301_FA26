import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PropertyDraftProvider } from './features/hotel_partner/context/PropertyDraftContext';

// Auth Pages
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import CustomerRegister from './features/auth/pages/CustomerRegister';
import PartnerRegister from './features/auth/pages/PartnerRegister';

// Layouts
import CustomerLayout from './features/customer/components/CustomerLayout';
import AdminLayout from './features/admin/components/AdminLayout';
import PartnerLayout from './features/hotel_partner/components/PartnerLayout';
import ManagerLayout from './features/operation_manager/components/ManagerLayout';

// Customer Pages
import Home from './features/customer/pages/Home';
import ProfilePage from './features/customer/pages/ProfilePage';
import HotelSearchPage from './features/customer/pages/HotelSearchPage';
import HotelDetailsPage from './features/customer/pages/HotelDetailsPage';
import BookingPage from './features/customer/pages/BookingPage';
import BookingConfirmationPage from './features/customer/pages/BookingConfirmationPage';
import VNPayReturnPage from './features/customer/pages/VNPayReturnPage';
import BookingHistoryPage from './features/customer/pages/BookingHistoryPage';
import MyReviewsPage from './features/customer/pages/MyReviewsPage';
import WriteReviewPage from './features/customer/pages/WriteReviewPage';
import CancelBookingPage from './features/customer/pages/CancelBookingPage';

// Guards
import ProtectedRoute from './components/ProtectedRoute';

//Partners Pages
import PartnerTerms from './features/hotel_partner/pages/PartnerTerms';
import PartnerPropertyLocation from './features/hotel_partner/pages/PartnerPropertyLocation';
import PartnerPropertyAmenities from './features/hotel_partner/pages/PartnerPropertyAmenities';
import PartnerPropertyRooms from './features/hotel_partner/pages/PartnerPropertyRooms';
import PartnerPropertyPhotos from './features/hotel_partner/pages/PartnerPropertyPhotos';
import PartnerPropertyDetails from './features/hotel_partner/pages/PartnerPropertyDetails';
import PartnerPropertyProfile from './features/hotel_partner/pages/PartnerPropertyProfile';
import PartnerPropertyPublish from './features/hotel_partner/pages/PartnerPropertyPublish';

// Role Dashboards
import AdminDashboard from './features/admin/pages/AdminDashboard';
import UserManagement from './features/admin/pages/UserManagement';
import PartnerDashboard from './features/hotel_partner/pages/PartnerDashboard';
import ManagerDashboard from './features/operation_manager/pages/ManagerDashboard';
import ManagerQueuePage from './features/operation_manager/pages/ManagerQueuePage';
import PartnerOperationsPage from './features/operation_manager/pages/PartnerOperationsPage';
import CommissionPolicyPage from './features/operation_manager/pages/CommissionPolicyPage';
import PayoutPage from './features/operation_manager/pages/PayoutPage';
import ManagerAuditLogPage from './features/operation_manager/pages/ManagerAuditLogPage';
import SystemConfiguration from './features/admin/pages/SystemConfiguration';
import SystemLog from './features/admin/pages/SystemLog';


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/customer" element={<CustomerRegister />} />
          <Route path="/register/user" element={<CustomerRegister />} />
          <Route path="/register/partner" element={<PartnerRegister />} />

          {/* Customer Routes (Default) */}
          <Route path="/" element={<CustomerLayout />}>
            <Route index element={<Home />} />
            <Route path="hotels" element={<HotelSearchPage />} />
            <Route path="hotels/:hotelId" element={<HotelDetailsPage />} />
            <Route path="booking/vnpay-return" element={<VNPayReturnPage />} />

            <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
              <Route path="booking" element={<BookingPage />} />
              <Route path="booking/confirmation/:bookingCode" element={<BookingConfirmationPage />} />
              <Route path="booking/cancel/:bookingId" element={<CancelBookingPage />} />
              <Route path="booking/cancel/:bookingCode" element={<CancelBookingPage />} />
              <Route path="booking-history" element={<BookingHistoryPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="change-password" element={<ProfilePage section="password" />} />
              <Route path="my-reviews" element={<MyReviewsPage />} />
              <Route path="reviews" element={<MyReviewsPage />} />
              <Route path="write-review/:bookingId" element={<WriteReviewPage />} />
              <Route path="reviews/new/:bookingId" element={<WriteReviewPage />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="system-config" element={<SystemConfiguration />} />
            <Route path="logs" element={<SystemLog />} />
          </Route>
          {/* Hotel Partner Routes */}
          <Route path="/partner" element={<PropertyDraftProvider><PartnerLayout /></PropertyDraftProvider>}>
            <Route index element={<PartnerDashboard />} />
            <Route path="terms" element={<PartnerTerms />} />
            <Route path="property-location" element={<PartnerPropertyLocation />} />
            <Route path="property-amenities" element={<PartnerPropertyAmenities />} />
            <Route path="property-rooms" element={<PartnerPropertyRooms />} />
            <Route path="property-photos" element={<PartnerPropertyPhotos />} />
            <Route path="property-details" element={<PartnerPropertyDetails />} />
            <Route path="property-profile" element={<PartnerPropertyProfile />} />
            <Route path="property-publish" element={<PartnerPropertyPublish />} />
          </Route>

          {/* Hotel Partner Routes */}
          <Route path="/partner" element={<PartnerLayout />}>
            <Route index element={<PartnerDashboard />} />
            {/* Add more partner routes here */}
          </Route>

          {/* Platform Manager Routes */}
          <Route element={<ProtectedRoute allowedRoles={['OPERATIONS_MANAGER']} />}>
            <Route path="/manager" element={<ManagerLayout />}>
              <Route index element={<ManagerDashboard />} />
              <Route path="verifications" element={<ManagerQueuePage type="verifications" />} />
              <Route path="partner-operations" element={<PartnerOperationsPage />} />
              <Route path="disputes" element={<ManagerQueuePage type="disputes" />} />
              <Route path="refunds" element={<ManagerQueuePage type="refunds" />} />
              <Route path="commissions" element={<CommissionPolicyPage />} />
              <Route path="payouts" element={<PayoutPage />} />
              <Route path="audit-history" element={<ManagerAuditLogPage />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;

