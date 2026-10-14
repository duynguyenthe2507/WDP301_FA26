import crypto from 'crypto';
import qs from 'qs';

// Đọc env lúc truy cập qua getter để tránh phụ thuộc vào thời điểm nạp dotenv
export const vnpayConfig = {
  get vnp_TmnCode() {
    return process.env.VNP_TMN_CODE;
  },
  get vnp_HashSecret() {
    return process.env.VNP_HASH_SECRET;
  },
  get vnp_Url() {
    return process.env.VNP_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
  },
  get vnp_ReturnUrl() {
    return process.env.VNP_RETURN_URL || 'http://localhost:3000/booking/vnpay-return';
  },
};

// Sắp xếp object chuẩn theo thứ tự alphabet và encode value theo chuẩn VNPay
export const sortObject = (obj) => {
  const sorted = {};
  const str = [];
  let key;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[decodeURIComponent(str[key])]).replace(/%20/g, '+');
  }
  return sorted;
};

// Sinh chuỗi ngày tháng YYYYMMDDHHmmss theo múi giờ Việt Nam (GMT+7)
const getVnpayDate = () => {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
};

// 1. Hàm tạo URL thanh toán
export const createPaymentUrl = ({
  bookingCode,
  amount,
  ipAddr = '127.0.0.1',
  orderInfo = 'Thanh toan don dat phong',
  bankCode = '',
}) => {
  const tmnCode = String(vnpayConfig.vnp_TmnCode || '').trim();
  const secretKey = String(vnpayConfig.vnp_HashSecret || '').trim();
  const vnpUrl = String(vnpayConfig.vnp_Url || '').trim();
  const returnUrl = String(vnpayConfig.vnp_ReturnUrl || '').trim();

  // Chuẩn hóa IP sang IPv4 (tránh dính IPv6 loopback '::1' từ localhost)
  let safeIp = ipAddr;
  if (!safeIp || safeIp === '::1' || safeIp.includes(':')) {
    safeIp = '127.0.0.1';
  }

  // Chuẩn hóa OrderInfo: bỏ dấu tiếng Việt và ký tự đặc biệt
  const cleanOrderInfo = String(orderInfo)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();

  let vnp_Params = {
    vnp_Version: '2.1.0',
    vnp_Command: 'pay',
    vnp_TmnCode: tmnCode,
    vnp_Locale: 'vn',
    vnp_CurrCode: 'VND',
    vnp_TxnRef: String(bookingCode),
    vnp_OrderInfo: cleanOrderInfo || `Thanh toan don dat phong ${bookingCode}`,
    vnp_OrderType: 'other',
    vnp_Amount: Math.round(Number(amount) * 100), // Quy đổi sang đơn vị đồng * 100
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: safeIp,
    vnp_CreateDate: getVnpayDate(),
  };

  if (bankCode) {
    vnp_Params['vnp_BankCode'] = bankCode;
  }

  // 1. Sắp xếp các tham số theo bảng chữ cái A-Z và mã hóa chuẩn VNPay
  const sortedParams = sortObject(vnp_Params);

  // 2. Chuỗi dùng để ký (signData): encode: false vì sortObject đã xử lý encodeURIComponent
  const signData = qs.stringify(sortedParams, { encode: false });

  // 3. Băm HMAC-SHA512
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  // 4. Gán mã hash vào params
  sortedParams['vnp_SecureHash'] = signed;

  // 5. Tạo link chuyển hướng với encode: false (đồng bộ 100% với chuỗi đã băm)
  const paymentUrl = `${vnpUrl}?${qs.stringify(sortedParams, { encode: false })}`;

  const maskedSecret =
    secretKey.length > 8
      ? `${secretKey.slice(0, 4)}...${secretKey.slice(-4)} (độ dài: ${secretKey.length})`
      : `[QUÁ NGẮN: ${secretKey.length} ký tự]`;

  console.log('\n================== [VNPAY DEBUG: TẠO URL THANH TOÁN] ==================');
  console.log('📌 VNP_TMN_CODE    :', tmnCode);
  console.log('📌 VNP_HASH_SECRET  :', maskedSecret);
  console.log('📌 vnp_TxnRef       :', bookingCode);
  console.log('📌 vnp_Amount       :', vnp_Params.vnp_Amount, `(${amount} VND)`);
  console.log('📌 Chuỗi mang đi băm (signData):');
  console.log('   >', signData);
  console.log('📌 Chữ ký vừa sinh (vnp_SecureHash):');
  console.log('   >', signed);
  console.log('📌 URL chuyển hướng:');
  console.log('   >', paymentUrl);

  // Gửi probe request ngầm sang VNPay để đọc lý do VNPay chấp nhận hay từ chối
  fetch(paymentUrl)
    .then(async (res) => {
      const html = await res.text();
      console.log('\n--- [VNPAY PROBE: KẾT QUẢ TỪ CỔNG SANDBOX.VNPAYMENT.VN] ---');
      if (html.includes('Invalid signature') || html.includes('Sai chữ ký')) {
        console.error('❌ VNPay phản hồi: [SAI CHỮ KÝ - INVALID SIGNATURE] (Code 70)');
        console.error('👉 NGUYÊN NHÂN: Thuật toán mã hóa HMAC-SHA512 đã chuẩn, nhưng VNP_HASH_SECRET trong .env KHÔNG KHỚP với VNP_TMN_CODE trên Sandbox!');
        console.error('👉 CÁCH FIX: Bạn hãy kiểm tra lại email đăng ký VNPay Sandbox để lấy đúng mã HASH_SECRET của Terminal', tmnCode);
      } else if (html.includes('The terminal (website) not found') || html.includes('không tìm thấy')) {
        console.error(`❌ VNPay phản hồi: [KHÔNG TÌM THẤY TERMINAL] Mã VNP_TMN_CODE="${tmnCode}" không tồn tại trên VNPay Sandbox.`);
      } else {
        console.log('✅ VNPay Sandbox phản hồi: [HỢP LỆ 100%] Đã mở thành công trang thanh toán VNPay!');
      }
      console.log('=========================================================================\n');
    })
    .catch((err) => {
      console.warn('[VNPAY PROBE WARNING] Không thể gửi probe sang VNPay:', err.message);
    });

  return { paymentUrl, bookingCode };
};

// Chế độ mock (VNP_MOCK=true): bỏ qua cổng VNPay, trả thẳng về ReturnUrl với tham số
// giả lập đã được ký bằng secret của chính app để verifyReturnData vẫn chạy đúng.
export const createMockReturnUrl = ({ bookingCode, amount }) => {
  const secretKey = String(vnpayConfig.vnp_HashSecret || 'mock').trim();
  const returnUrl = String(vnpayConfig.vnp_ReturnUrl).trim();

  let params = {
    vnp_Amount: Math.round(Number(amount) * 100),
    vnp_BankCode: 'NCB',
    vnp_CardType: 'ATM',
    vnp_OrderInfo: `Thanh toan don dat phong ${bookingCode}`,
    vnp_PayDate: getVnpayDate(),
    vnp_ResponseCode: '00',
    vnp_TmnCode: String(vnpayConfig.vnp_TmnCode || 'MOCK').trim(),
    vnp_TransactionNo: String(Date.now()).slice(-8),
    vnp_TransactionStatus: '00',
    vnp_TxnRef: String(bookingCode),
  };

  params = sortObject(params);
  const signData = qs.stringify(params, { encode: false });
  params['vnp_SecureHash'] = crypto
    .createHmac('sha512', secretKey)
    .update(Buffer.from(signData, 'utf-8'))
    .digest('hex');

  console.log('\n[VNPAY MOCK] Chế độ Mock được kích hoạt - Bỏ qua cổng VNPay');
  console.log('Booking Code:', bookingCode, '| Số tiền:', amount);

  return `${returnUrl}?${qs.stringify(params, { encode: false })}`;
};

// 2. Hàm kiểm tra chữ ký trả về (Return URL / Webhook IPN)
export const verifyReturnData = (vnpParams) => {
  const secretKey = String(vnpayConfig.vnp_HashSecret || '').trim();
  const secureHash = vnpParams['vnp_SecureHash'];

  const cleanParams = { ...vnpParams };
  delete cleanParams['vnp_SecureHash'];
  delete cleanParams['vnp_SecureHashType'];

  // Sắp xếp tham số nhận về
  const sortedParams = sortObject(cleanParams);

  // Tạo chuỗi thô để so sánh chữ ký
  const signData = qs.stringify(sortedParams, { encode: false });

  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  const isHashValid = Boolean(secureHash) && secureHash.toLowerCase() === signed.toLowerCase();
  const responseCode = vnpParams['vnp_ResponseCode'] || '';
  const isSuccess = isHashValid && responseCode === '00';

  console.log('\n================== [VNPAY DEBUG: XÁC THỰC KẾT QUẢ TRẢ VỀ] ==================');
  console.log('📌 vnp_TxnRef       :', vnpParams['vnp_TxnRef']);
  console.log('📌 vnp_ResponseCode  :', responseCode, `(${responseCode === '00' ? 'Giao dịch thành công' : 'Thất bại/Hủy'})`);
  console.log('📌 vnp_SecureHash nhận được :');
  console.log('   >', secureHash);
  console.log('📌 Chuỗi server dùng để băm lại (signData):');
  console.log('   >', signData);
  console.log('📌 vnp_SecureHash server tự tính :');
  console.log('   >', signed);
  console.log('📌 Kết quả kiểm tra chữ ký   :', isHashValid ? '✅ HỢP LỆ (Match)' : '❌ SAI CHỮ KÝ (Mismatch)');
  console.log('===============================================================================\n');

  return {
    isSuccess,
    isHashValid,
    responseCode,
    bookingCode: vnpParams['vnp_TxnRef'],
    transactionNo: vnpParams['vnp_TransactionNo'],
    bankCode: vnpParams['vnp_BankCode'],
    cardType: vnpParams['vnp_CardType'],
    payDate: vnpParams['vnp_PayDate'],
    amount: Number(vnpParams['vnp_Amount']) / 100,
  };
};