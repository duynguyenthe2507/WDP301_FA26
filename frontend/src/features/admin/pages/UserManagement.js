import React, { useEffect, useState } from "react";
import { getUsers, updateUser } from "../adminApi";

// Tên vai trò để hiển thị cho admin.
const roleNames = {
  CUSTOMER: "Khách hàng",
  PARTNER: "Đối tác",
  STAFF: "Nhân viên",
  ADMIN: "Quản trị viên",
};

// Tên và màu của từng trạng thái tài khoản.
const statusNames = {
  ACTIVE: "Hoạt động",
  SUSPENDED: "Tạm khóa",
  BLOCKED: "Bị khóa",
};

const emptyFilters = {
  search: "",
  role: "",
  status: "",
  from: "",
  to: "",
};

function UserManagement() {
  // Dữ liệu đang nhập trên form tìm kiếm.
  const [filters, setFilters] = useState({ ...emptyFilters });
  // Bộ lọc đã bấm nút tìm kiếm.
  const [appliedFilters, setAppliedFilters] = useState({});

  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [status, setStatus] = useState("ACTIVE");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  // Tải lại danh sách khi trang mở hoặc khi admin tìm kiếm.
  useEffect(() => {
    async function loadUsers() {
      setLoading(true);

      try {
        const result = await getUsers(appliedFilters);
        setUsers(result.users);
        setHasError(false);
      } catch (error) {
        setHasError(true);
        if (
          error.response &&
          error.response.data &&
          error.response.data.message
        ) {
          setMessage(error.response.data.message);
        } else {
          setMessage("Không thể tải danh sách tài khoản.");
        }
      }

      setLoading(false);
    }

    loadUsers();
  }, [appliedFilters]);

  // Ghi lại nội dung vừa nhập vào đúng ô trong form tìm kiếm.
  function changeFilter(event) {
    const name = event.target.name;
    const value = event.target.value;

    setFilters({ ...filters, [name]: value });
  }

  // Bấm Tìm kiếm: dùng các giá trị đang nhập để tải danh sách.
  function searchUsers(event) {
    event.preventDefault();
    setSelectedUser(null);
    setMessage("");
    setHasError(false);
    setAppliedFilters({ ...filters });
  }

  // Xóa các ô lọc và tải lại tất cả tài khoản.
  function clearFilters() {
    setFilters({ ...emptyFilters });
    setSelectedUser(null);
    setMessage("");
    setHasError(false);
    setAppliedFilters({});
  }

  // Chọn một dòng trong bảng để xem và sửa trạng thái.
  function selectUser(user) {
    setSelectedUser(user);
    setStatus(user.status);
    setReason(user.status_reason || "");
    setMessage("");
    setHasError(false);
  }

  // Gửi trạng thái mới lên backend.
  async function saveChanges() {
    if (!selectedUser || selectedUser.status === "BLOCKED") {
      return;
    }

    if (status !== "ACTIVE" && reason.trim() === "") {
      setHasError(true);
      setMessage("Hãy nhập lý do khóa tài khoản.");
      return;
    }

    const confirmed = window.confirm(
      `Xác nhận đổi trạng thái sang "${statusNames[status]}"?`,
    );
    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      const result = await updateUser(selectedUser._id, {
        status: status,
        reason: status === "ACTIVE" ? "" : reason.trim(),
      });

      setHasError(false);
      setMessage(result.message);
      setSelectedUser(null);

      // Tải lại bảng để hiện trạng thái vừa lưu.
      setAppliedFilters({ ...appliedFilters });
    } catch (error) {
      setHasError(true);

      if (
        error.response &&
        error.response.data &&
        error.response.data.message
      ) {
        setMessage(error.response.data.message);
      } else {
        setMessage("Không thể cập nhật tài khoản.");
      }
    }

    setSaving(false);
  }

  return (
    <div>
      <h2>Quản lý tài khoản</h2>
      {message && (
        <div className={`alert ${hasError ? "alert-danger" : "alert-success"}`}>
          {message}
        </div>
      )}

      {/* Form tìm tài khoản */}
      <div className="card mb-4">
        <div className="card-body">
          <form onSubmit={searchUsers}>
            <div className="row g-3">
              <div className="col-md-4">
                <label className="form-label">
                  Tên, email hoặc số điện thoại
                </label>
                <input
                  className="form-control"
                  name="search"
                  value={filters.search}
                  onChange={changeFilter}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Vai trò</label>
                <select
                  className="form-select"
                  name="role"
                  value={filters.role}
                  onChange={changeFilter}
                >
                  <option value="">Tất cả</option>
                  {Object.entries(roleNames).map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label">Trạng thái</label>
                <select
                  className="form-select"
                  name="status"
                  value={filters.status}
                  onChange={changeFilter}
                >
                  <option value="">Tất cả</option>
                  {Object.entries(statusNames).map(([value, name]) => (
                    <option key={value} value={value}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-2">
                <label className="form-label">Đăng ký từ ngày</label>
                <input
                  className="form-control"
                  type="date"
                  name="from"
                  value={filters.from}
                  onChange={changeFilter}
                />
              </div>

              <div className="col-md-2">
                <label className="form-label">Đến ngày</label>
                <input
                  className="form-control"
                  type="date"
                  name="to"
                  value={filters.to}
                  onChange={changeFilter}
                />
              </div>
            </div>

            <button className="btn btn-primary mt-3" type="submit">
              Tìm kiếm
            </button>
            <button
              className="btn btn-secondary mt-3 ms-2"
              type="button"
              onClick={clearFilters}
            >
              Xóa lọc
            </button>
          </form>
        </div>
      </div>

      {/* Bảng danh sách tài khoản */}
      <div className="card mb-4">
        <div className="card-body">
          <h5>Danh sách tài khoản ({users.length})</h5>

          {loading ? (
            <p>Đang tải danh sách...</p>
          ) : users.length === 0 ? (
            <p>Không tìm thấy tài khoản.</p>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày đăng ký</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user._id}>
                      <td>
                        {user.fullName}
                        <br />
                        {user.email}
                      </td>
                      <td>{roleNames[user.role] || user.role}</td>
                      <td>{statusNames[user.status] || user.status}</td>
                      <td>
                        {new Date(user.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td>
                        <button
                          className="btn btn-outline-primary btn-sm"
                          type="button"
                          onClick={() => selectUser(user)}
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Thông tin và form đổi trạng thái */}
      <div className="card">
        <div className="card-body">
          <h5>Chi tiết tài khoản</h5>

          {!selectedUser ? (
            <p>Chọn một tài khoản trong bảng để xem chi tiết.</p>
          ) : (
            <>
              <p>
                <strong>Họ tên:</strong> {selectedUser.fullName}
              </p>
              <p>
                <strong>Email:</strong> {selectedUser.email}
              </p>
              <p>
                <strong>Số điện thoại:</strong>{" "}
                {selectedUser.phoneNumber || "Chưa cập nhật"}
              </p>
              <p>
                <strong>Vai trò:</strong>{" "}
                {roleNames[selectedUser.role] || selectedUser.role}
              </p>
              <p>
                <strong>Trạng thái:</strong> {statusNames[selectedUser.status]}
              </p>

              {selectedUser.status === "BLOCKED" ? (
                <div className="alert alert-danger">
                  Tài khoản đã bị khóa vĩnh viễn và không thể mở lại.
                  <br />
                  Lý do: {selectedUser.status_reason || "Không có"}
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="form-label">Trạng thái mới</label>
                    <select
                      className="form-select"
                      value={status}
                      onChange={(event) => setStatus(event.target.value)}
                    >
                      {Object.entries(statusNames).map(([value, name]) => (
                        <option key={value} value={value}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {status !== "ACTIVE" && (
                    <div className="mb-3">
                      <label className="form-label">Lý do khóa</label>
                      <textarea
                        className="form-control"
                        rows="3"
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                      />
                    </div>
                  )}

                  <button
                    className="btn btn-primary"
                    type="button"
                    onClick={saveChanges}
                    disabled={saving}
                  >
                    {saving ? "Đang lưu..." : "Xác nhận thay đổi"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserManagement;
