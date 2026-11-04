import { useContext, useEffect, useState } from "react";
import { Alert, Badge, Button, Card, Form, Modal, Nav, Spinner, Table } from "react-bootstrap";
import { FaFileExport } from "react-icons/fa";
import { AuthContext } from "../../../context/AuthContext";
import { HorizontalBars, StatTile, TrendColumns } from "../components/StatsCharts";
import TablePagination from "../components/TablePagination";
import { BOOKING_STATUS, formatDate, formatDateTime, formatMoney, formatPercent, isInvalidRange, MAX_RANGE_DAYS, MESSAGES, PAYOUT_STATUS } from "../data/bookingOptions";
import { getPayout, getPayouts, getRevenueLines, getRevenueReport, getStatistics } from "../partnerApi";

const TABS = [
  ["overview", "Tổng quan"],
  ["guests", "Thống kê khách"],
  ["bookings", "Thống kê đặt phòng"],
  ["revenue", "Thống kê doanh thu"],
  ["payouts", "Lịch sử thanh toán"],
];
const PERIODS = [
  ["thisMonth", "Tháng này"],
  ["lastMonth", "Tháng trước"],
  ["last3Months", "3 tháng gần nhất"],
  ["custom", "Tùy chọn"],
];

const toDateStr = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const periodRange = (period) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  if (period === "lastMonth") return { from: toDateStr(new Date(year, month - 1, 1)), to: toDateStr(new Date(year, month, 0)) };
  if (period === "last3Months") return { from: toDateStr(new Date(year, month - 2, 1)), to: toDateStr(new Date(year, month + 1, 0)) };
  return { from: toDateStr(new Date(year, month, 1)), to: toDateStr(new Date(year, month + 1, 0)) };
};

const PartnerStatistics = () => {
  const { token } = useContext(AuthContext);
  const [tab, setTab] = useState("overview");
  const [period, setPeriod] = useState("thisMonth");
  const [customRange, setCustomRange] = useState(periodRange("thisMonth"));
  // Kỳ đang áp dụng; khoảng ngày sai thì không đổi để giữ kết quả cũ
  const [criteria, setCriteria] = useState(periodRange("thisMonth"));
  const [rangeError, setRangeError] = useState("");
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    getStatistics(criteria, token)
      .then(({ data }) => { if (active) setStats(data); })
      .catch((requestError) => { if (active) setLoadError(requestError.response?.data?.message || "Không thể tải dữ liệu thống kê."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [criteria, token, retryCount]);

  const changePeriod = (event) => {
    const value = event.target.value;
    setPeriod(value);
    setRangeError("");
    if (value !== "custom") setCriteria(periodRange(value));
  };
  const applyCustomRange = () => {
    if (!customRange.from || !customRange.to || isInvalidRange(customRange.from, customRange.to)) { setRangeError(MESSAGES.invalidRange(MAX_RANGE_DAYS)); return; }
    setRangeError("");
    setCriteria({ ...customRange });
  };

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1280 }}>
      <div className="text-muted small mb-3">Khách sạn của tôi / Thống kê</div>
      <h1 className="h3 fw-bold mb-4">Thống kê</h1>

      <Nav variant="tabs" className="mb-3" activeKey={tab} onSelect={setTab}>
        {TABS.map(([key, label]) => <Nav.Item key={key}><Nav.Link eventKey={key} className="text-dark">{label}</Nav.Link></Nav.Item>)}
      </Nav>

      {tab === "payouts" ? <PayoutHistory token={token} /> : (
        <>
          <div className="row g-2 align-items-end mb-3">
            <Form.Group className="col-md-3" controlId="stats-period"><Form.Label className="small fw-semibold">Khoảng thời gian</Form.Label><Form.Select value={period} onChange={changePeriod}>{PERIODS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Form.Select></Form.Group>
            {period === "custom" && <>
              <Form.Group className="col-6 col-md-2" controlId="stats-from"><Form.Label className="small fw-semibold">Từ ngày</Form.Label><Form.Control type="date" value={customRange.from} onChange={(event) => setCustomRange((current) => ({ ...current, from: event.target.value }))} /></Form.Group>
              <Form.Group className="col-6 col-md-2" controlId="stats-to"><Form.Label className="small fw-semibold">Đến ngày</Form.Label><Form.Control type="date" value={customRange.to} onChange={(event) => setCustomRange((current) => ({ ...current, to: event.target.value }))} /></Form.Group>
              <div className="col-auto"><Button variant="dark" onClick={applyCustomRange}>Áp dụng</Button></div>
            </>}
            <div className="col small text-muted text-md-end">{formatDate(criteria.from)} – {formatDate(criteria.to)}</div>
            {rangeError && <div className="col-12 text-danger small">{rangeError}</div>}
          </div>

          {loadError && <Alert variant="danger" className="d-flex justify-content-between align-items-center">{loadError}<Button size="sm" variant="outline-danger" onClick={() => setRetryCount((count) => count + 1)}>Thử lại</Button></Alert>}
          {loading && !stats && <div className="text-center p-5"><Spinner /></div>}
          {stats && !stats.hasData && !loading && <Card className="border-0 shadow-sm rounded-4"><Card.Body className="text-center text-muted py-5">{MESSAGES.NO_STATISTICS}</Card.Body></Card>}
          {stats?.hasData && (
            <div style={{ opacity: loading ? 0.6 : 1 }}>
              {tab === "overview" && <OverviewTab stats={stats} />}
              {tab === "guests" && <GuestsTab stats={stats} />}
              {tab === "bookings" && <BookingsTab stats={stats} />}
              {tab === "revenue" && <RevenueTab stats={stats} criteria={criteria} token={token} />}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const Panel = ({ children }) => <Card className="border-0 shadow-sm rounded-4 h-100"><Card.Body className="p-3 p-md-4">{children}</Card.Body></Card>;
const Tiles = ({ items }) => <div className="row row-cols-2 row-cols-lg-3 g-3 mb-3">{items.map((item) => <div className="col" key={item.label}><StatTile {...item} /></div>)}</div>;
const granularityLabel = (stats) => (stats.granularity === "day" ? "theo ngày" : "theo tháng");

const OverviewTab = ({ stats }) => {
  const { overview, trend } = stats;
  const payout = overview.latestPayout;
  return (
    <>
      <Tiles items={[
        { label: "Tổng số khách", value: overview.totalGuests.toLocaleString("vi-VN") },
        { label: "Tổng đặt phòng", value: overview.totalBookings.toLocaleString("vi-VN") },
        { label: "Công suất phòng", value: formatPercent(overview.occupancy) },
        { label: "Doanh thu gộp", value: formatMoney(overview.gross) },
        { label: "Doanh thu ròng", value: formatMoney(overview.net) },
        { label: "Thanh toán gần nhất", value: payout ? PAYOUT_STATUS[payout.status].label : "—", hint: payout ? `${payout.payoutCode} · ${formatMoney(payout.netAmount)}` : "" },
      ]} />
      <div className="row g-3">
        <div className="col-lg-6"><Panel><TrendColumns title={`Số đặt phòng ${granularityLabel(stats)}`} data={trend} valueKey="bookings" formatValue={(value) => `${value} đặt phòng`} /></Panel></div>
        <div className="col-lg-6"><Panel><TrendColumns title={`Doanh thu gộp ${granularityLabel(stats)}`} data={trend} valueKey="revenue" formatValue={formatMoney} /></Panel></div>
      </div>
    </>
  );
};

const GuestsTab = ({ stats }) => {
  const { guests, trend, roomTypes } = stats;
  return (
    <>
      <div className="row row-cols-2 row-cols-lg-4 g-3 mb-3">
        <div className="col"><StatTile label="Tổng số khách" value={guests.total.toLocaleString("vi-VN")} /></div>
        <div className="col"><StatTile label="Khách mới" value={guests.new.toLocaleString("vi-VN")} /></div>
        <div className="col"><StatTile label="Khách quay lại" value={guests.returning.toLocaleString("vi-VN")} /></div>
        <div className="col"><StatTile label="Trung bình khách / đơn" value={guests.averagePerBooking.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} /></div>
      </div>
      <div className="row g-3">
        <div className="col-lg-7"><Panel><TrendColumns title={`Số khách ${granularityLabel(stats)}`} data={trend} valueKey="guests" formatValue={(value) => `${value} khách`} /></Panel></div>
        <div className="col-lg-5"><Panel><HorizontalBars title="Khách theo loại phòng" rows={roomTypes.map((room) => ({ key: room.key, label: room.roomTypeName, value: room.guests }))} /></Panel></div>
      </div>
    </>
  );
};

const BookingsTab = ({ stats }) => {
  const { bookings, trend, roomTypes } = stats;
  return (
    <>
      <Tiles items={[
        ...bookings.byStatus.map(({ status, count }) => ({ label: BOOKING_STATUS[status].label, value: count.toLocaleString("vi-VN") })),
        { label: "Tỷ lệ hủy", value: formatPercent(bookings.cancellationRate) },
        { label: "Công suất phòng", value: formatPercent(bookings.occupancy) },
        { label: "Thời gian lưu trú TB", value: `${bookings.averageStay.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} đêm` },
      ]} />
      <div className="row g-3">
        <div className="col-lg-7"><Panel><TrendColumns title={`Số đặt phòng ${granularityLabel(stats)}`} data={trend} valueKey="bookings" formatValue={(value) => `${value} đặt phòng`} /></Panel></div>
        <div className="col-lg-5"><Panel><HorizontalBars title="Đặt phòng theo loại phòng" rows={roomTypes.map((room) => ({ key: room.key, label: room.roomTypeName, value: room.bookings }))} /></Panel></div>
      </div>
    </>
  );
};

const RevenueTab = ({ stats, criteria, token }) => {
  const { revenue, trend, roomTypes } = stats;
  const [lines, setLines] = useState(null);
  const [page, setPage] = useState(1);
  const [linesError, setLinesError] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [exportedMessage, setExportedMessage] = useState("");

  useEffect(() => { setPage(1); }, [criteria]);
  useEffect(() => {
    let active = true;
    setLinesError("");
    getRevenueLines({ ...criteria, page }, token)
      .then(({ data }) => { if (active) setLines(data); })
      .catch((requestError) => { if (active) setLinesError(requestError.response?.data?.message || "Không thể tải chi tiết doanh thu."); });
    return () => { active = false; };
  }, [criteria, page, token]);

  return (
    <>
      <div className="d-flex justify-content-end mb-2"><Button variant="outline-dark" size="sm" onClick={() => setShowExport(true)}><FaFileExport className="me-2" />Xuất báo cáo</Button></div>
      {exportedMessage && <Alert variant="success" dismissible onClose={() => setExportedMessage("")}>{exportedMessage}</Alert>}
      <Tiles items={[
        { label: "Doanh thu gộp", value: formatMoney(revenue.gross) },
        { label: "Hoa hồng nền tảng", value: formatMoney(revenue.commission) },
        { label: "Doanh thu ròng", value: formatMoney(revenue.net) },
        { label: "Đặt phòng hoàn thành", value: revenue.completedCount.toLocaleString("vi-VN") },
        { label: "Đặt phòng đã hủy", value: revenue.cancelledCount.toLocaleString("vi-VN") },
        { label: "Phí hủy giữ lại", value: formatMoney(revenue.retainedFees) },
      ]} />
      <div className="mb-3"><Panel><TrendColumns title={`Doanh thu gộp ${granularityLabel(stats)}`} data={trend} valueKey="revenue" formatValue={formatMoney} /></Panel></div>

      <Card className="border-0 shadow-sm rounded-4 overflow-hidden mb-3">
        <Card.Body className="pb-0"><h3 className="h6 fw-bold">Theo loại phòng</h3></Card.Body>
        <Table responsive className="align-middle mb-0 small">
          <thead className="table-light"><tr><th>Loại phòng</th><th className="text-end">Số đơn</th><th className="text-end">Doanh thu gộp</th><th className="text-end">Hoa hồng</th><th className="text-end">Doanh thu ròng</th></tr></thead>
          <tbody>{roomTypes.map((room) => <tr key={room.key}><td>{room.roomTypeName}</td><td className="text-end">{room.revenueBookings}</td><td className="text-end text-nowrap">{formatMoney(room.gross)}</td><td className="text-end text-nowrap">{formatMoney(room.commission)}</td><td className="text-end text-nowrap">{formatMoney(room.net)}</td></tr>)}</tbody>
        </Table>
      </Card>

      <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
        <Card.Body className="pb-0"><h3 className="h6 fw-bold">Chi tiết theo đặt phòng</h3></Card.Body>
        {linesError && <Alert variant="danger" className="mx-3">{linesError}</Alert>}
        <Table responsive className="align-middle mb-0 small">
          <thead className="table-light"><tr><th>Mã đặt phòng</th><th>Loại phòng</th><th>Lưu trú</th><th>Trạng thái</th><th className="text-end">Gộp</th><th className="text-end">Hoa hồng</th><th className="text-end">Ròng</th></tr></thead>
          <tbody>
            {lines?.lines.map((line) => <tr key={line._id}><td className="fw-semibold text-nowrap">{line.bookingCode}</td><td>{line.roomTypeName}</td><td className="text-nowrap">{formatDate(line.checkInDate)} – {formatDate(line.checkOutDate)}</td><td>{BOOKING_STATUS[line.bookingStatus].label}</td><td className="text-end text-nowrap">{formatMoney(line.gross)}</td><td className="text-end text-nowrap">{formatMoney(line.commission)}</td><td className="text-end text-nowrap">{formatMoney(line.net)}</td></tr>)}
            {lines && !lines.lines.length && <tr><td colSpan="7" className="text-center text-muted py-4">{MESSAGES.NO_STATISTICS}</td></tr>}
          </tbody>
        </Table>
        {lines?.pagination.totalPages > 1 && <Card.Footer className="bg-white"><TablePagination pagination={lines.pagination} onChange={setPage} /></Card.Footer>}
      </Card>
      <ExportModal show={showExport} criteria={criteria} token={token} onClose={() => setShowExport(false)} onDone={(message) => { setShowExport(false); setExportedMessage(message); }} />
    </>
  );
};

// Tên file theo khách sạn và kỳ báo cáo; bỏ ký tự không hợp lệ trong tên file
const reportFileName = ({ hotelName, from, to }) => `Doanh-thu_${hotelName.replace(/[\\/:*?"<>|\s]+/g, "-")}_${from}_${to}.csv`;
const csvCell = (value) => `"${String(value).replace(/"/g, '""')}"`;
const downloadCsv = (report) => {
  const rows = [
    ["Khách sạn", report.hotelName],
    ["Kỳ báo cáo", `${formatDate(report.from)} - ${formatDate(report.to)}`],
    [],
    ["Mã đặt phòng", "Nhận phòng", "Trả phòng", "Loại phòng", "Doanh thu gộp", "Hoa hồng", "Doanh thu ròng"],
    ...report.lines.map((line) => [line.bookingCode, formatDate(line.checkInDate), formatDate(line.checkOutDate), line.roomTypeName, line.gross, line.commission, line.net]),
    ["Tổng cộng", "", "", "", report.totals.gross, report.totals.commission, report.totals.net],
  ];
  // BOM để Excel đọc đúng tiếng Việt
  const blob = new Blob([`﻿${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = reportFileName(report);
  link.click();
  URL.revokeObjectURL(url);
};

const ExportModal = ({ show, criteria, token, onClose, onDone }) => {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setExporting(true);
    setError("");
    try {
      const { data } = await getRevenueReport(criteria, token);
      downloadCsv(data);
      onDone(`Đã xuất báo cáo ${reportFileName(data)}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Không thể tạo báo cáo.");
    } finally {
      setExporting(false);
    }
  };
  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton><Modal.Title className="h5">Xuất báo cáo doanh thu</Modal.Title></Modal.Header>
      <Modal.Body>
        <p className="small">Kỳ báo cáo: {formatDate(criteria.from)} – {formatDate(criteria.to)}. Báo cáo không chứa thông tin liên hệ của khách.</p>
        <Form.Group controlId="export-format"><Form.Label className="small fw-semibold">Định dạng</Form.Label><Form.Select defaultValue="csv"><option value="csv">CSV</option><option disabled>XLSX (chưa hỗ trợ)</option><option disabled>PDF (chưa hỗ trợ)</option></Form.Select></Form.Group>
        {error && <div className="text-danger small mt-2">{error}</div>}
      </Modal.Body>
      <Modal.Footer><Button variant="outline-secondary" onClick={onClose}>Hủy</Button><Button variant="dark" disabled={exporting} onClick={submit}>{exporting ? "Đang xuất..." : "Xuất báo cáo"}</Button></Modal.Footer>
    </Modal>
  );
};

const EMPTY_PAYOUT_FILTERS = { status: "", from: "", to: "" };

const PayoutHistory = ({ token }) => {
  const [draft, setDraft] = useState(EMPTY_PAYOUT_FILTERS);
  const [filters, setFilters] = useState(EMPTY_PAYOUT_FILTERS);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [rangeError, setRangeError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [selected, setSelected] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoadError("");
    getPayouts({ ...filters, page }, token)
      .then(({ data }) => { if (active) setResult(data); })
      .catch((requestError) => { if (active) setLoadError(requestError.response?.data?.message || "Không thể tải lịch sử thanh toán."); });
    return () => { active = false; };
  }, [filters, page, token, retryCount]);

  const updateDraft = (event) => setDraft((current) => ({ ...current, [event.target.name]: event.target.value }));
  const apply = (event) => {
    event.preventDefault();
    // Lọc theo ngày cần đủ cả hai đầu
    if (Boolean(draft.from) !== Boolean(draft.to) || isInvalidRange(draft.from, draft.to)) { setRangeError(MESSAGES.invalidRange(MAX_RANGE_DAYS)); return; }
    setRangeError("");
    setPage(1);
    setFilters(draft);
  };
  const openPayout = (payout) => getPayout(payout._id, token)
    .then(({ data }) => setSelected(data.payout))
    .catch((requestError) => setLoadError(requestError.response?.data?.message || "Không thể tải khoản thanh toán."));

  return (
    <>
      <Form onSubmit={apply} className="row g-2 align-items-end mb-3">
        <Form.Group className="col-md-2" controlId="payout-status"><Form.Label className="small fw-semibold">Trạng thái</Form.Label><Form.Select name="status" value={draft.status} onChange={updateDraft}><option value="">Tất cả</option>{Object.entries(PAYOUT_STATUS).map(([value, { label }]) => <option key={value} value={value}>{label}</option>)}</Form.Select></Form.Group>
        <Form.Group className="col-6 col-md-2" controlId="payout-from"><Form.Label className="small fw-semibold">Từ ngày</Form.Label><Form.Control type="date" name="from" value={draft.from} onChange={updateDraft} /></Form.Group>
        <Form.Group className="col-6 col-md-2" controlId="payout-to"><Form.Label className="small fw-semibold">Đến ngày</Form.Label><Form.Control type="date" name="to" value={draft.to} onChange={updateDraft} /></Form.Group>
        <div className="col-auto"><Button type="submit" variant="dark">Lọc</Button></div>
        {rangeError && <div className="col-12 text-danger small">{rangeError}</div>}
      </Form>
      {loadError && <Alert variant="danger" className="d-flex justify-content-between align-items-center">{loadError}<Button size="sm" variant="outline-danger" onClick={() => setRetryCount((count) => count + 1)}>Thử lại</Button></Alert>}
      {!result && !loadError && <div className="text-center p-5"><Spinner /></div>}
      {result && (
        <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
          <Table responsive hover className="align-middle mb-0 small">
            <thead className="table-light"><tr><th>Mã thanh toán</th><th>Kỳ</th><th className="text-end">Gộp</th><th className="text-end">Hoa hồng</th><th className="text-end">Điều chỉnh</th><th className="text-end">Thực nhận</th><th>Ngày trả</th><th>Trạng thái</th></tr></thead>
            <tbody>
              {result.payouts.map((payout) => <tr key={payout._id} role="button" onClick={() => openPayout(payout)}><td className="fw-semibold text-nowrap">{payout.payoutCode}</td><td className="text-nowrap">{formatDate(payout.periodStart)} – {formatDate(payout.periodEnd)}</td><td className="text-end text-nowrap">{formatMoney(payout.grossRevenue)}</td><td className="text-end text-nowrap">{formatMoney(payout.commissionAmount)}</td><td className="text-end text-nowrap">{payout.adjustment ? `-${formatMoney(payout.adjustment)}` : formatMoney(0)}</td><td className="text-end text-nowrap fw-semibold">{formatMoney(payout.netAmount)}</td><td className="text-nowrap">{payout.paidAt ? formatDateTime(payout.paidAt) : "—"}</td><td><Badge bg={PAYOUT_STATUS[payout.status].bg} text={PAYOUT_STATUS[payout.status].bg === "info" ? "dark" : undefined} className="fw-normal">{PAYOUT_STATUS[payout.status].label}</Badge></td></tr>)}
              {!result.payouts.length && <tr><td colSpan="8" className="text-center text-muted py-5">{MESSAGES.NO_PAYOUTS}</td></tr>}
            </tbody>
          </Table>
          {result.pagination.totalPages > 1 && <Card.Footer className="bg-white"><TablePagination pagination={result.pagination} onChange={setPage} /></Card.Footer>}
        </Card>
      )}
      <Modal show={Boolean(selected)} onHide={() => setSelected(null)} size="lg" centered scrollable>
        <Modal.Header closeButton><Modal.Title className="h5">Khoản thanh toán {selected?.payoutCode}</Modal.Title></Modal.Header>
        {selected && (
          <Modal.Body className="small">
            <div className="row g-2 mb-3">
              <PayoutInfo label="Kỳ thanh toán" value={`${formatDate(selected.periodStart)} – ${formatDate(selected.periodEnd)}`} />
              <PayoutInfo label="Doanh thu gộp" value={formatMoney(selected.grossRevenue)} />
              <PayoutInfo label="Hoa hồng" value={formatMoney(selected.commissionAmount)} />
              <PayoutInfo label="Điều chỉnh (hủy, hoàn tiền)" value={formatMoney(selected.adjustment)} />
              <PayoutInfo label="Thực nhận" value={<strong>{formatMoney(selected.netAmount)}</strong>} />
              <PayoutInfo label="Mã giao dịch" value={selected.paymentReference || "—"} />
              <PayoutInfo label="Ngày thanh toán" value={selected.paidAt ? formatDateTime(selected.paidAt) : "—"} />
              {selected.note && <PayoutInfo label="Ghi chú" value={selected.note} />}
            </div>
            <h3 className="h6 fw-bold">Các đặt phòng trong kỳ ({selected.bookings.length})</h3>
            <Table responsive size="sm" className="align-middle mb-0"><thead className="table-light"><tr><th>Mã đặt phòng</th><th>Lưu trú</th><th className="text-end">Gộp</th><th className="text-end">Hoa hồng</th><th className="text-end">Ròng</th></tr></thead><tbody>{selected.bookings.map((line) => <tr key={line._id}><td className="text-nowrap">{line.bookingCode}</td><td className="text-nowrap">{formatDate(line.checkInDate)} – {formatDate(line.checkOutDate)}</td><td className="text-end text-nowrap">{formatMoney(line.gross)}</td><td className="text-end text-nowrap">{formatMoney(line.commission)}</td><td className="text-end text-nowrap">{formatMoney(line.net)}</td></tr>)}</tbody></Table>
          </Modal.Body>
        )}
      </Modal>
    </>
  );
};
const PayoutInfo = ({ label, value }) => <div className="col-sm-6 col-lg-4"><div className="text-muted">{label}</div><div>{value}</div></div>;

export default PartnerStatistics;
