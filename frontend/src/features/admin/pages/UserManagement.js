import React, { useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Col, Form, Row, Spinner, Table } from 'react-bootstrap';
import { getUsers, updateUser } from '../adminApi';

const emptyFilters = { search: '', role: '', status: '', from: '', to: '' };

const roles = [
  { value: 'CUSTOMER', label: 'Khách hàng' },
  { value: 'PARTNER', label: 'Đối tác' },
  { value: 'STAFF', label: 'Nhân viên' },
  { value: 'ADMIN', label: 'Quản trị viên' },
];

const UserManagement = () => {
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [hasError, setHasError] = useState(false);

  const selectedUser = users.find((user) => user._id === selectedUserId);

  // Tải lại danh sách khi admin áp dụng bộ lọc.
  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const result = await getUsers(appliedFilters);
        setUsers(result.users);
      } catch (error) {
        setHasError(true);
        setMessage(error.response?.data?.message || 'Không thể tải danh sách tài khoản.');
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [appliedFilters]);

  const changeFilter = (event) => {
    setFilters({ ...filters, [event.target.name]: event.target.value });
  };

  const searchUsers = (event) => {
    event.preventDefault();
    setSelectedUserId('');
    setMessage('');
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setSelectedUserId('');
    setMessage('');
    setAppliedFilters({ ...emptyFilters });
  };

  const selectUser = (user) => {
    setSelectedUserId(user._id);
    setRole(user.role);
    setStatus(user.status);
    setMessage('');
  };

  const saveChanges = async () => {
    if (!selectedUser) return;
    if (!window.confirm(`Lưu thay đổi cho ${selectedUser.email}?`)) return;

    setSaving(true);
    setMessage('');
    try {
      const result = await updateUser(selectedUser._id, { role, status });
      setHasError(false);
      setMessage(result.message);
      setSelectedUserId('');
      // Tải lại danh sách để thấy vai trò và trạng thái mới.
      setAppliedFilters({ ...appliedFilters });
    } catch (error) {
      setHasError(true);
      setMessage(error.response?.data?.message || 'Không thể cập nhật tài khoản.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2>Quản lý tài khoản &amp; phân quyền</h2>
      <p className="text-muted">Tìm tài khoản, đổi vai trò hoặc kích hoạt và tạm khóa tài khoản.</p>

      {message && <Alert variant={hasError ? 'danger' : 'success'}>{message}</Alert>}

      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body>
          <Form onSubmit={searchUsers}>
            <Row className="g-3 align-items-end">
              <Col md={4}>
                <Form.Label>Tên, email hoặc số điện thoại</Form.Label>
                <Form.Control name="search" value={filters.search} onChange={changeFilter} />
              </Col>
              <Col md={2}>
                <Form.Label>Vai trò</Form.Label>
                <Form.Select name="role" value={filters.role} onChange={changeFilter}>
                  <option value="">Tất cả</option>
                  {roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label>Trạng thái</Form.Label>
                <Form.Select name="status" value={filters.status} onChange={changeFilter}>
                  <option value="">Tất cả</option>
                  <option value="ACTIVE">Đang hoạt động</option>
                  <option value="BLOCKED">Tạm khóa</option>
                </Form.Select>
              </Col>
              <Col md={2}>
                <Form.Label>Đăng ký từ ngày</Form.Label>
                <Form.Control type="date" name="from" value={filters.from} onChange={changeFilter} />
              </Col>
              <Col md={2}>
                <Form.Label>Đến ngày</Form.Label>
                <Form.Control type="date" name="to" value={filters.to} onChange={changeFilter} />
              </Col>
              <Col>
                <Button type="submit">Tìm kiếm</Button>
                <Button type="button" variant="outline-secondary" className="ms-2" onClick={clearFilters}>
                  Xóa lọc
                </Button>
              </Col>
            </Row>
          </Form>
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm rounded-4 mb-4">
        <Card.Body>
          <h5>Danh sách tài khoản ({users.length})</h5>
          {loading ? (
            <Spinner animation="border" />
          ) : users.length === 0 ? (
            <p className="text-muted mb-0">Không tìm thấy tài khoản.</p>
          ) : (
            <div className="table-responsive">
              <Table hover className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày đăng ký</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>{user.full_name}<br /><small className="text-muted">{user.email}</small></td>
                      <td>{roles.find((item) => item.value === user.role)?.label}</td>
                      <td>
                        <Badge bg={user.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {user.status === 'ACTIVE' ? 'Hoạt động' : 'Tạm khóa'}
                        </Badge>
                      </td>
                      <td>{new Date(user.created_at).toLocaleDateString('vi-VN')}</td>
                      <td>
                        <Button size="sm" variant="outline-primary" onClick={() => selectUser(user)}>
                          Chọn
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </Card>

      <Card className="border-0 shadow-sm rounded-4">
        <Card.Body>
          <h5>Cập nhật tài khoản</h5>
          {!selectedUser ? (
            <p className="text-muted mb-0">Chọn một tài khoản trong danh sách trước.</p>
          ) : (
            <>
              <p>{selectedUser.full_name} ({selectedUser.email})</p>
              <Row className="g-3">
                <Col md={4}>
                  <Form.Label>Vai trò</Form.Label>
                  <Form.Select value={role} onChange={(event) => setRole(event.target.value)}>
                    {roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Label>Trạng thái</Form.Label>
                  <Form.Select value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="BLOCKED">Tạm khóa</option>
                  </Form.Select>
                </Col>
                <Col md={4} className="d-flex align-items-end gap-2">
                  <Button variant="outline-secondary" onClick={() => setRole('CUSTOMER')}>
                    Đặt lại quyền
                  </Button>
                  <Button onClick={saveChanges} disabled={saving}>
                    {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                  </Button>
                </Col>
              </Row>
              <small className="text-muted d-block mt-2">
                Đặt lại quyền chuyển vai trò về Khách hàng. Hãy bấm Lưu thay đổi để xác nhận.
              </small>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default UserManagement;
