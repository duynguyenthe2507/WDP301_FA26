import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

// Auth Pages
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';

// Layouts
import CustomerLayout from './features/customer/components/CustomerLayout';
import AdminLayout from './features/admin/components/AdminLayout';
import PartnerLayout from './features/hotel_partner/components/PartnerLayout';
import ManagerLayout from './features/platform_manager/components/ManagerLayout';

// Customer Pages
import Home from './features/customer/pages/Home';
import RoomsList from './features/customer/pages/RoomsList';
import RoomDetails from './features/customer/pages/RoomDetails';
import Booking from './features/customer/pages/Booking';
import ProfilePage from './features/customer/pages/ProfilePage';
import HotelSearchPage from './features/customer/pages/HotelSearchPage';
import HotelDetailsPage from './features/customer/pages/HotelDetailsPage';

// Guards
import ProtectedRoute from './components/ProtectedRoute';

// Role Dashboards
import AdminDashboard from './features/admin/pages/AdminDashboard';
import PartnerDashboard from './features/hotel_partner/pages/PartnerDashboard';
import ManagerDashboard from './features/platform_manager/pages/ManagerDashboard';


function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Customer Routes (Default) */}
          <Route path="/" element={<CustomerLayout />}>
            <Route index element={<Home />} />
            <Route path="rooms" element={<RoomsList />} />
            <Route path="room/:id" element={<RoomDetails />} />
            <Route path="hotels" element={<HotelSearchPage />} />
            <Route path="hotels/:hotelId" element={<HotelDetailsPage />} />
            <Route path="booking" element={<Booking />} />

            {/* Profile - yêu cầu đăng nhập CUSTOMER */}
            <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
              <Route path="profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Admin Routes */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            {/* Add more admin routes here */}
          </Route>

          {/* Hotel Partner Routes */}
          <Route path="/partner" element={<PartnerLayout />}>
            <Route index element={<PartnerDashboard />} />
            {/* Add more partner routes here */}
          </Route>

          {/* Platform Manager Routes */}
          <Route path="/manager" element={<ManagerLayout />}>
            <Route index element={<ManagerDashboard />} />
            {/* Add more manager routes here */}
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
