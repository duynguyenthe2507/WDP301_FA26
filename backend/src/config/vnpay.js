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

// Hàm sắp xếp các key theo bảng chữ cái alphabet (A-Z) chuẩn theo template VNPay
export function sortObject(obj) {
  var sorted = {};
  var str = [];
  var key;
  for (key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}

// Sinh chuỗi ngày tháng yyyyMMddHHmmss theo múi giờ Việt Nam (GMT+7)
const getVnpayDate = () => {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(
    d.getUTCHours()
  )}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
};

// 1. Hàm tạo URL thanh toán chuẩn theo template router.post('/create_payment_url')
export const createPaymentUrl = ({
  bookingCode,
  amount,
  ipAddr = '127.0.0.1',
  orderInfo = 'Thanh toan don dat phong',
  bankCode = '',
  orderType = 'other',
  locale = 'vn',
}) => {
  const tmnCode = String(vnpayConfig.vnp_TmnCode || '').trim();
  const secretKey = String(vnpayConfig.vnp_HashSecret || '').trim();
  let vnpUrl = String(vnpayConfig.vnp_Url || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html').trim();
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

  let vnp_Params = {};
  vnp_Params['vnp_Version'] = '2.1.0';
  vnp_Params['vnp_Command'] = 'pay';
  vnp_Params['vnp_TmnCode'] = tmnCode;
  vnp_Params['vnp_Locale'] = locale || 'vn';
  vnp_Params['vnp_CurrCode'] = 'VND';
  vnp_Params['vnp_TxnRef'] = String(bookingCode);
  vnp_Params['vnp_OrderInfo'] = cleanOrderInfo || `Thanh toan don dat phong ${bookingCode}`;
  vnp_Params['vnp_OrderType'] = orderType || 'other';
  vnp_Params['vnp_Amount'] = Math.round(Number(amount) * 100);
  vnp_Params['vnp_ReturnUrl'] = returnUrl;
  vnp_Params['vnp_IpAddr'] = safeIp;
  vnp_Params['vnp_CreateDate'] = getVnpayDate();

  if (bankCode && bankCode !== '') {
    vnp_Params['vnp_BankCode'] = bankCode;
  }

  vnp_Params = sortObject(vnp_Params);

  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  vnp_Params['vnp_SecureHash'] = signed;
  vnpUrl += '?' + qs.stringify(vnp_Params, { encode: false });

  // console.log('\n================== [VNPAY DEBUG: TẠO URL THANH TOÁN] ==================');
  // console.log(`VNP_TMN_CODE="${tmnCode}"`);
  // console.log(`VNP_HASH_SECRET="${secretKey}"`);
  // console.log('📌 vnp_TxnRef       :', bookingCode);
  // console.log('📌 vnp_Amount       :', vnp_Params['vnp_Amount'], `(${amount} VND)`);
  // console.log('📌 Chuỗi mang đi băm (signData):');
  // console.log('   >', signData);
  // console.log('📌 Chữ ký vừa sinh (vnp_SecureHash):');
  // console.log('   >', signed);
  // console.log('📌 URL chuyển hướng:');
  // console.log('   >', vnpUrl);
  // console.log('=========================================================================\n');

  return { paymentUrl: vnpUrl, bookingCode };
};

// 2. Hàm kiểm tra chữ ký trả về chuẩn theo template router.get('/vnpay_return') và IPN
export const verifyReturnData = (vnpParams) => {
  let vnp_Params = { ...vnpParams };
  const secureHash = vnp_Params['vnp_SecureHash'];

  delete vnp_Params['vnp_SecureHash'];
  delete vnp_Params['vnp_SecureHashType'];

  vnp_Params = sortObject(vnp_Params);

  const secretKey = String(vnpayConfig.vnp_HashSecret || '').trim();

  const signData = qs.stringify(vnp_Params, { encode: false });
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  const isHashValid = Boolean(secureHash) && secureHash.toLowerCase() === signed.toLowerCase();
  const responseCode = vnpParams['vnp_ResponseCode'] || '';
  const isSuccess = isHashValid && responseCode === '00';

  // console.log('\n================== [VNPAY DEBUG: XÁC THỰC KẾT QUẢ TRẢ VỀ] ==================');
  // console.log(`VNP_TMN_CODE="${vnpParams['vnp_TmnCode'] || vnpayConfig.vnp_TmnCode}"`);
  // console.log(`VNP_HASH_SECRET="${secretKey}"`);
  // console.log('📌 vnp_TxnRef       :', vnpParams['vnp_TxnRef']);
  // console.log('📌 vnp_ResponseCode  :', responseCode, `(${responseCode === '00' ? 'Giao dịch thành công' : 'Thất bại/Hủy'})`);
  // console.log('📌 vnp_SecureHash nhận được :');
  // console.log('   >', secureHash);
  // console.log('📌 Chuỗi server dùng để băm lại (signData):');
  // console.log('   >', signData);
  // console.log('📌 vnp_SecureHash server tự tính :');
  // console.log('   >', signed);
  // console.log('📌 Kết quả kiểm tra chữ ký   :', isHashValid ? '✅ HỢP LỆ (Match)' : '❌ SAI CHỮ KÝ (Mismatch)');
  // console.log('===============================================================================\n');

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