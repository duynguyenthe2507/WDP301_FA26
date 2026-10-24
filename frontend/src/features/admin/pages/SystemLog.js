import React, { useState, useEffect } from "react";
import axios from "axios";

const SystemLog = () => {
  const [logs, setLogs] = useState([]);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [timeRange, setTimeRange] = useState("TODAY");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:9999/api/admin/logs", {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          action: typeFilter,
          search: search,
        },
      });

      if (response.data) {
        setLogs(response.data.logs || []);
      }
    } catch (error) {
      console.log("Lỗi tải nhật ký hệ thống");
    } finally {
      setLoading(false);
    }
  };

  // Tự động tải khi mở trang
  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="container py-4">
      <h2 className="mb-4 fw-bold">Nhật ký hệ thống</h2>

      <div className="card mb-4 p-3 border shadow-sm">
        <div className="row g-3 align-items-center">
          <div className="col-md-3 d-flex align-items-center gap-2">
            <label className="fw-bold text-nowrap">Loại nhật ký</label>
            <select
              className="form-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ALL">Tất cả</option>
              <option value="ACCOUNT_SUSPENDED">AUDIT_LOG (Tạm khóa)</option>
              <option value="ACCOUNT_DEACTIVATED">AUDIT_LOG (Bị khóa)</option>
              <option value="ACCOUNT_ACTIVATED">AUDIT_LOG (Mở khóa)</option>
              <option value="SYSTEM_CONFIG_UPDATED">
                SYSTEM_LOG (Cấu hình)
              </option>
            </select>
          </div>
          <div className="col-md-3 d-flex align-items-center gap-2">
            <label className="fw-bold text-nowrap">Thời gian</label>
            <select
              className="form-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="TODAY">Hôm nay</option>
              <option value="7DAYS">7 ngày qua</option>
              <option value="30DAYS">30 ngày qua</option>
              <option value="ALL">Tất cả thời gian</option>
            </select>
          </div>
          <div className="col-md-3">
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="col-md-3">
            <button
              className="btn btn-primary w-100 fw-bold"
              onClick={fetchLogs}
            >
              Lọc
            </button>
          </div>
        </div>
      </div>

      <div className="card p-3 border shadow-sm">
        <div className="table-responsive">
          <table className="table align-middle">
            <thead className="table-light">
              <tr>
                <th style={{ width: "20%" }}>Thời gian</th>
                <th style={{ width: "15%" }}>Tài khoản</th>
                <th style={{ width: "20%" }}>Loại nhật ký</th>
                <th style={{ width: "45%" }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="4" className="text-center py-3">
                    Đang tải nhật ký...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log, index) => {
                  const dateStr = log.createdAt
                    ? new Date(log.createdAt).toLocaleString("vi-VN")
                    : "N/A";
                  const adminName = log.admin_id?.fullName || "Admin";

                  return (
                    <tr key={index}>
                      <td>{dateStr}</td>
                      <td>{adminName}</td>
                      <td>
                        <strong>
                          {log.action?.includes("SYSTEM")
                            ? "SYSTEM_LOG"
                            : "AUDIT_LOG"}
                        </strong>
                      </td>
                      <td>
                        {log.action === "ACCOUNT_SUSPENDED" &&
                          `Đổi trạng thái "Tạm khóa" do: ${log.new_reason || "Nghi ngờ điều tra"}`}
                        {log.action === "ACCOUNT_DEACTIVATED" &&
                          `Đổi trạng thái "Bị khóa" do: ${log.new_reason || "Vi phạm hợp đồng"}`}
                        {log.action === "ACCOUNT_ACTIVATED" &&
                          "Mở khóa hoạt động lại cho tài khoản"}
                        {log.action === "SYSTEM_CONFIG_UPDATED" &&
                          (log.new_reason ||
                            "Cập nhật cấu hình bảo trì hệ thống")}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <p>Không tìm thấy dữ liệu</p>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SystemLog;
