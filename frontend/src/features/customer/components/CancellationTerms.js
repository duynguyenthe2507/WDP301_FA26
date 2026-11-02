import React from 'react';

const formatPrice = (price) =>
  new Intl.NumberFormat('vi-VN').format(price) + ' đ';

// Cùng hạn với backend (REFUND_TIERS trong customerController): tính đến 14:00 của ngày nhận phòng trừ N ngày
const REFUND_TIERS = {
  one: [{ days: 1, rate: 1 }],
  three: [{ days: 3, rate: 1 }],
  none: [],
};

const CancellationTerms = ({ policy, checkIn, totalAmount = 0 }) => {
  const tiers = REFUND_TIERS[policy];
  if (!tiers) return null;

  const deadlineText = (days) => {
    const d = new Date(`${checkIn}T14:00:00`);
    d.setDate(d.getDate() - days);
    return `14:00 ngày ${d.toLocaleDateString('vi-VN')}`;
  };
  const deadlinePassed = (days) => {
    const d = new Date(`${checkIn}T14:00:00`);
    d.setDate(d.getDate() - days);
    return Date.now() > d.getTime();
  };

  return (
    <div className="p-2 border rounded-2 small mt-2" style={{ fontSize: '0.8rem' }}>
      <div className="fw-bold mb-1">Điều khoản hủy phòng</div>
      {tiers.length === 0 ? (
        <div>Không hoàn hủy: hủy phòng sẽ không được hoàn lại số tiền đã thanh toán ({formatPrice(totalAmount)}).</div>
      ) : checkIn && (
        <>
          {tiers.map((t) => (
            <div key={t.days}>
              Hủy trước <strong>{deadlineText(t.days)}</strong>: hoàn {Math.round(t.rate * 100)}%
              {' '}({formatPrice(Math.round(totalAmount * t.rate))})
            </div>
          ))}
          <div>Hủy sau thời hạn trên: không được hoàn tiền.</div>
          {tiers.every((t) => deadlinePassed(t.days)) && (
            <div className="text-danger fw-semibold mt-1">
              Đã quá hạn hoàn tiền: nếu hủy đơn này bạn sẽ không được hoàn lại tiền.
            </div>
          )}
        </>
      )}
      <div className="text-muted mt-1">Hoàn tiền chỉ áp dụng cho đơn đã thanh toán.</div>
    </div>
  );
};

export default CancellationTerms;
