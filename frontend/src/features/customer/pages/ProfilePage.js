import React, { useState, useEffect, useContext } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Badge } from 'react-bootstrap';
import {
  FaUser, FaEnvelope, FaPhone, FaLock, FaEdit, FaSave, FaTimes
} from 'react-icons/fa';
import { AuthContext } from '../../../context/AuthContext';
import { getMyProfile, updateMyProfile, changePassword } from '../customerApi';

const ProfilePage = () => {
  const { logout } = useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Edit profile
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ full_name: '', phone_number: '' });
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateMsg, setUpdateMsg] = useState({ type: '', text: '' });

  // Change password
  const [pwData, setPwData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getMyProfile();
        setProfile(res.data);
        setFormData({
          full_name: res.data.full_name || '',
          phone_number: res.data.phone_number || ''
        });
      } catch (err) {
        if (err.response?.status === 401) logout();
      } finally {
        setLoadingProfile(false);
      }
    };
    fetch();
  }, [logout]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (formData.full_name.trim().length < 2) {
      setUpdateMsg({ type: 'danger', text: 'Họ tên phải có ít nhất 2 ký tự' });
      return;
    }
    setUpdateLoading(true);
    setUpdateMsg({ type: '', text: '' });
    try {
      const res = await updateMyProfile({
        full_name: formData.full_name.trim(),
        phone_number: formData.phone_number.trim()
      });
      setProfile(res.data.user);
      setEditMode(false);
      setUpdateMsg({ type: 'success', text: 'Cập nhật thông tin thành công!' });
    } catch (err) {
      setUpdateMsg({ type: 'danger', text: err.response?.data?.message || 'Cập nhật thất bại' });
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setFormData({
      full_name: profile?.full_name || '',
      phone_number: profile?.phone_number || ''
    });
    setUpdateMsg({ type: '', text: '' });
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg({ type: '', text: '' });

    if (pwData.new_password.length < 8) {
      setPwMsg({ type: 'danger', text: 'Mật khẩu mới phải có ít nhất 8 ký tự' });
      return;
    }
    if (pwData.new_password !== pwData.confirm_password) {
      setPwMsg({ type: 'danger', text: 'Xác nhận mật khẩu không khớp' });
      return;
    }

    setPwLoading(true);
    try {
      await changePassword(pwData);
      setPwMsg({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setPwData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwMsg({ type: 'danger', text: err.response?.data?.message || 'Đổi mật khẩu thất bại' });
    } finally {
      setPwLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div
            className="spinner-border mb-3"
            style={{ color: '#d4af37', width: '3rem', height: '3rem' }}
          />
          <p className="text-muted fw-semibold">Đang tải hồ sơ...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: '#1a202c', padding: '3rem 0' }}>
        <Container>
          <div className="d-flex align-items-center gap-3">
            <div
              className="d-flex align-items-center justify-content-center rounded-circle text-white fw-bold"
              style={{
                width: '72px',
                height: '72px',
                background: '#d4af37',
                fontSize: '1.8rem',
                flexShrink: 0
              }}
            >
              {profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2
                className="text-white fw-bold mb-1"
                style={{ fontFamily: 'Playfair Display, serif' }}
              >
                {profile?.full_name}
              </h2>
              <Badge
                style={{ background: '#d4af37' }}
                className="px-3 py-1 rounded-pill"
              >
                Khách hàng
              </Badge>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-5">
        <Row className="g-4">
          {/* Profile info card */}
          <Col lg={7}>
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-4 p-md-5">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h4
                    className="fw-bold mb-0"
                    style={{ fontFamily: 'Playfair Display, serif' }}
                  >
                    Thông tin cá nhân
                  </h4>
                  {!editMode ? (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="rounded-pill px-3"
                      onClick={() => {
                        setEditMode(true);
                        setUpdateMsg({ type: '', text: '' });
                      }}
                    >
                      <FaEdit className="me-1" /> Chỉnh sửa
                    </Button>
                  ) : (
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      className="rounded-pill px-3"
                      onClick={handleCancelEdit}
                    >
                      <FaTimes className="me-1" /> Hủy
                    </Button>
                  )}
                </div>

                {updateMsg.text && (
                  <Alert variant={updateMsg.type} className="rounded-3 small">
                    {updateMsg.text}
                  </Alert>
                )}

                <Form onSubmit={handleUpdateProfile}>
                  {/* Full name */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold small text-muted text-uppercase">
                      <FaUser className="me-1" style={{ color: '#d4af37' }} /> Họ và tên
                    </Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={formData.full_name}
                        onChange={(e) =>
                          setFormData({ ...formData, full_name: e.target.value })
                        }
                        className="rounded-3 p-3"
                        style={{ borderColor: '#e2e8f0' }}
                        required
                      />
                    ) : (
                      <p className="fs-5 fw-semibold mb-0 ps-1">{profile?.full_name || '—'}</p>
                    )}
                  </Form.Group>

                  {/* Email - always readonly */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold small text-muted text-uppercase">
                      <FaEnvelope className="me-1" style={{ color: '#d4af37' }} /> Email
                    </Form.Label>
                    <p className="fs-5 fw-semibold mb-0 ps-1 text-muted">{profile?.email}</p>
                    <small className="text-muted">Email không thể thay đổi</small>
                  </Form.Group>

                  {/* Phone */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold small text-muted text-uppercase">
                      <FaPhone className="me-1" style={{ color: '#d4af37' }} /> Số điện thoại
                    </Form.Label>
                    {editMode ? (
                      <Form.Control
                        type="text"
                        value={formData.phone_number}
                        onChange={(e) =>
                          setFormData({ ...formData, phone_number: e.target.value })
                        }
                        className="rounded-3 p-3"
                        placeholder="Số điện thoại"
                        style={{ borderColor: '#e2e8f0' }}
                      />
                    ) : (
                      <p className="fs-5 fw-semibold mb-0 ps-1">
                        {profile?.phone_number || '—'}
                      </p>
                    )}
                  </Form.Group>

                  {editMode && (
                    <Button
                      type="submit"
                      disabled={updateLoading}
                      className="rounded-pill px-4 fw-bold"
                      style={{ background: '#d4af37', border: 'none' }}
                    >
                      {updateLoading ? (
                        <span className="spinner-border spinner-border-sm me-2" />
                      ) : (
                        <FaSave className="me-2" />
                      )}
                      {updateLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </Button>
                  )}
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Change password card */}
          <Col lg={5}>
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-4 p-md-5">
                <h4
                  className="fw-bold mb-4"
                  style={{ fontFamily: 'Playfair Display, serif' }}
                >
                  <FaLock className="me-2" style={{ color: '#d4af37' }} />
                  Đổi mật khẩu
                </h4>

                {pwMsg.text && (
                  <Alert variant={pwMsg.type} className="rounded-3 small">
                    {pwMsg.text}
                  </Alert>
                )}

                <Form onSubmit={handleChangePassword}>
                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small text-muted">
                      Mật khẩu hiện tại
                    </Form.Label>
                    <Form.Control
                      type="password"
                      value={pwData.current_password}
                      onChange={(e) =>
                        setPwData({ ...pwData, current_password: e.target.value })
                      }
                      className="rounded-3 p-3"
                      style={{ borderColor: '#e2e8f0' }}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label className="fw-semibold small text-muted">
                      Mật khẩu mới
                    </Form.Label>
                    <Form.Control
                      type="password"
                      value={pwData.new_password}
                      onChange={(e) =>
                        setPwData({ ...pwData, new_password: e.target.value })
                      }
                      className="rounded-3 p-3"
                      placeholder="Tối thiểu 8 ký tự"
                      style={{ borderColor: '#e2e8f0' }}
                      required
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold small text-muted">
                      Xác nhận mật khẩu mới
                    </Form.Label>
                    <Form.Control
                      type="password"
                      value={pwData.confirm_password}
                      onChange={(e) =>
                        setPwData({ ...pwData, confirm_password: e.target.value })
                      }
                      className="rounded-3 p-3"
                      style={{ borderColor: '#e2e8f0' }}
                      required
                    />
                  </Form.Group>

                  <Button
                    type="submit"
                    disabled={pwLoading}
                    className="w-100 rounded-pill py-2 fw-bold"
                    style={{ background: '#1a202c', border: 'none', color: '#fff' }}
                  >
                    {pwLoading && (
                      <span className="spinner-border spinner-border-sm me-2" />
                    )}
                    {pwLoading ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                  </Button>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ProfilePage;
