import { useState } from "react";
import { Card } from "react-bootstrap";

const SERIES_COLOR = "#2a78d6";
const GRID_COLOR = "#e9e8e4";
const CHART_HEIGHT = 180;

const compactNumber = (value) => {
  const rounded = (amount) => (Math.round(amount * 10) / 10).toLocaleString("vi-VN");
  if (value >= 1e9) return `${rounded(value / 1e9)} tỷ`;
  if (value >= 1e6) return `${rounded(value / 1e6)} tr`;
  if (value >= 1e3) return `${Math.round(value / 1e3)}K`;
  return String(value);
};

// Làm tròn đỉnh trục tung về số đẹp: 1, 2, 2.5, 5 hoặc 10 nhân lũy thừa của 10
const niceMax = (value) => {
  if (value <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(value));
  const nice = [1, 2, 2.5, 5, 10].find((factor) => factor * step >= value);
  return nice * step;
};

export const StatTile = ({ label, value, hint, onClick }) => {
  const body = <><div className="text-muted small">{label}</div><div className="h4 fw-bold mb-0 mt-1" style={{ fontFamily: "inherit" }}>{value}</div>{hint && <div className="text-muted small mt-1">{hint}</div>}</>;
  return (
    <Card className="border-0 shadow-sm rounded-4 h-100">
      {onClick
        ? <button type="button" className="btn btn-link text-start text-decoration-none text-dark p-3 h-100" onClick={onClick}>{body}</button>
        : <Card.Body className="p-3">{body}</Card.Body>}
    </Card>
  );
};

// Biểu đồ cột một chuỗi; rê chuột hoặc focus vào cột để xem giá trị
export const TrendColumns = ({ title, data, valueKey, formatValue = (value) => value }) => {
  const [active, setActive] = useState(null);
  const max = niceMax(Math.max(...data.map((item) => item[valueKey]), 0));
  const ticks = [max, max / 2, 0];
  // Chỉ hiện khoảng 8 nhãn trục hoành để không chồng chữ
  const labelEvery = Math.max(1, Math.ceil(data.length / 8));

  return (
    <div>
      <h3 className="h6 fw-bold mb-3">{title}</h3>
      <div className="d-flex">
        <div className="position-relative text-muted flex-shrink-0" style={{ width: 44, height: CHART_HEIGHT, fontSize: 11 }} aria-hidden="true">
          {ticks.map((tick, index) => <span key={tick} className="position-absolute end-0 pe-2" style={{ top: `${(index / 2) * 100}%`, transform: "translateY(-50%)" }}>{compactNumber(tick)}</span>)}
        </div>
        <div className="flex-grow-1" style={{ minWidth: 0 }}>
          <div className="position-relative d-flex align-items-end" style={{ height: CHART_HEIGHT, gap: 2 }}>
            {[0, 50, 100].map((top) => <div key={top} className="position-absolute start-0 end-0" style={{ top: `${top}%`, borderTop: `1px solid ${GRID_COLOR}` }} />)}
            {data.map((item, index) => {
              const value = item[valueKey];
              const description = `${item.label}: ${formatValue(value)}`;
              return (
                <div
                  key={item.key}
                  role="img"
                  aria-label={description}
                  tabIndex={0}
                  className="position-relative h-100 d-flex align-items-end justify-content-center"
                  style={{ flex: "1 1 0", minWidth: 0, outlineOffset: -1, background: active === index ? "rgba(0,0,0,0.04)" : "transparent" }}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                >
                  <div style={{ width: "100%", maxWidth: 24, height: `${(value / max) * 100}%`, minHeight: value > 0 ? 2 : 0, background: SERIES_COLOR, borderRadius: "4px 4px 0 0" }} />
                  {active === index && (
                    <div className="position-absolute bg-dark text-white rounded-2 px-2 py-1 small text-nowrap" style={{ bottom: "100%", zIndex: 2, marginBottom: 4, ...(index > data.length / 2 ? { right: 0 } : { left: 0 }), pointerEvents: "none" }}>
                      {description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="d-flex text-muted mt-1" style={{ gap: 2, fontSize: 11 }} aria-hidden="true">
            {data.map((item, index) => <div key={item.key} className="text-center" style={{ flex: "1 1 0", minWidth: 0, whiteSpace: "nowrap", overflow: "visible" }}>{index % labelEvery === 0 ? item.label : ""}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
};

// Thanh ngang so sánh độ lớn giữa các nhóm, giá trị ghi ở cuối thanh
export const HorizontalBars = ({ title, rows, formatValue = (value) => value }) => {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <div>
      <h3 className="h6 fw-bold mb-3">{title}</h3>
      {rows.map((row) => (
        <div key={row.key} className="mb-3" title={`${row.label}: ${formatValue(row.value)}`}>
          <div className="small mb-1">{row.label}</div>
          <div className="d-flex align-items-center gap-2">
            <div className="flex-grow-1" style={{ minWidth: 0 }}>
              <div style={{ width: `${(row.value / max) * 100}%`, height: 16, minWidth: row.value > 0 ? 3 : 0, background: SERIES_COLOR, borderRadius: "0 4px 4px 0" }} />
            </div>
            <div className="small fw-semibold text-nowrap">{formatValue(row.value)}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
