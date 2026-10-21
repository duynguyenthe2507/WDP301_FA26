import React, { useState, useEffect } from "react";
import axios from "axios";

const SystemConfiguration = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get(
          "http://localhost:9999/api/admin/system-config",
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        );

        if (response.data) {
          setIsMaintenanceMode(response.data.isMaintenanceMode || false);
          setMaintenanceMessage(response.data.maintenanceMessage || "");
        }
      } catch (error) {
        console.log("Lỗi tải cấu hình hệ thống");
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "http://localhost:9999/api/admin/system-config",
        {
          isMaintenanceMode: isMaintenanceMode,
          maintenanceMessage: maintenanceMessage,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      alert("Đã cập nhật cấu hình hệ thống thành công!");
    } catch (error) {
      alert("Không thể lưu cấu hình, vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Đang tải cấu hình...</div>;

  return (
    <div className="container py-4">
      <div className="card p-4 border shadow-sm style={{ maxWidth: '800px' }}">
        <div className="mb-4">
          <label className="fw-bold mb-2 fs-5">Chế độ bảo trì</label>
          <div className="form-check form-switch fs-4">
            <input
              className="form-check-input"
              type="checkbox"
              id="maintenanceSwitch"
              checked={isMaintenanceMode}
              onChange={(e) => setIsMaintenanceMode(e.target.checked)}
            />
            <label
              className="form-check-label fs-6 ms-2"
              htmlFor="maintenanceSwitch"
            >
              {isMaintenanceMode ? "ĐANG BẬT" : "ĐANG TẮT"}
            </label>
          </div>
          <p className="fst-italic text-muted mt-2">
            Khi được kích hoạt, hệ thống sẽ không thể truy cập được
          </p>
        </div>

        <div className="mb-4">
          <textarea
            className="form-control p-3 border-primary"
            rows="6"
            placeholder="Thông báo bảo trì ở đây"
            value={maintenanceMessage}
            onChange={(e) => setMaintenanceMessage(e.target.value)}
          />
        </div>

        <div className="d-flex justify-content-end">
          <button
            className="btn btn-light border border-dark px-4 py-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Đang lưu..." : "Gửi thông báo"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SystemConfiguration;
