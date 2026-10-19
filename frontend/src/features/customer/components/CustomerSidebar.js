import React, { useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button } from 'react-bootstrap';
import { AuthContext } from '../../../context/AuthContext';

const CustomerSidebar = ({ activeKey = 'reviews' }) => {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);
  const [showSupportModal, setShowSupportModal] = useState(false);

  // Lấy chữ cái viết tắt đại diện Avatar (ví dụ: "Nguyễn Minh Anh" -> "MA")
  const getUserInitials = (name) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const displayName = user?.fullName || user?.email || '';
  const displayInitials = getUserInitials(displayName);

  const menuItems = [
    { key: 'bookings', label: 'Lịch sử đặt phòng', path: '/booking-history' },
    { key: 'profile', label: 'Hồ sơ cá nhân', path: '/profile' },
    { key: 'password', label: 'Đổi mật khẩu', path: '/profile' },
    { key: 'reviews', label: 'Đánh giá của tôi', path: '/my-reviews' },
    {
      key: 'complaints',
      label: 'Khiếu nại của tôi',
      action: () => setShowSupportModal(true),
    },
  ];

  return (
    <>
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Profile Card Header */}
        <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom">
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: '#fef3c7',
              color: '#92400e',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14.5px',
              flexShrink: 0,
            }}
          >
            {displayInitials}
          </div>
          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div
              style={{
                fontSize: '14.5px',
                fontWeight: 700,
                color: '#0f172a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {displayName}
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b' }}>
              Tài khoản khách hàng
            </div>
          </div>
        </div>

        {/* Menu Items */}
        <div className="d-flex flex-column gap-1">
          {menuItems.map((item) => {
            const isActive = activeKey === item.key;
            return (
              <div
                key={item.key}
                onClick={() => {
                  if (item.action) {
                    item.action();
                  } else if (item.path) {
                    navigate(item.path);
                  }
                }}
                style={{
                  backgroundColor: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#0284c7' : '#334155',
                  fontWeight: isActive ? 600 : 400,
                  borderRadius: '8px',
                  padding: '9px 12px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {item.label}
              </div>
            );
          })}

          <div style={{ borderTop: '1px solid #f1f5f9', margin: '8px 0' }} />

          {/* Đăng xuất */}
          <div
            onClick={() => logout()}
            style={{
              color: '#64748b',
              padding: '9px 12px',
              fontSize: '13px',
              cursor: 'pointer',
              borderRadius: '8px',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            Đăng xuất
          </div>
        </div>
      </div>

      {/* Modal Khiếu nại / CSKH */}
      <Modal show={showSupportModal} onHide={() => setShowSupportModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
            Khiếu nại & Hỗ trợ dịch vụ
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6 }}>
            VinaStay luôn cam kết bảo vệ quyền lợi tối đa của khách hàng trong suốt kỳ nghỉ. Nếu bạn có bất kỳ thắc mắc hoặc cần giải quyết sự cố, vui lòng liên hệ ngay với chúng tôi:
          </p>
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 16px',
              fontSize: '13px',
              color: '#1e293b',
            }}
          >
            <div className="mb-2">
              <strong>Hotline 24/7:</strong> <span className="text-primary fw-bold">1900 6868</span>
            </div>
            <div className="mb-2">
              <strong>Email hỗ trợ:</strong> support@vinastay.vn
            </div>
            <div>
              <strong>Thời gian xử lý:</strong> Phản hồi trong vòng 2 giờ làm việc
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" size="sm" onClick={() => setShowSupportModal(false)}>
            Đóng
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default CustomerSidebar;
