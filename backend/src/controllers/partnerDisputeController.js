import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import Booking from '../models/Booking.js';
import Dispute from '../models/Dispute.js';
import Notification from '../models/Notification.js';
import { findApprovedHotel, notApproved } from './partnerController.js';
import { vnDate } from './partnerStatisticsController.js';

// Partner chỉ xem và gửi phản hồi; tiếp nhận, kết luận, hoàn tiền là việc của Operations Manager
const PAGE_SIZE = 10;
const STATUSES = ['PENDING', 'IN_PROGRESS', 'WAITING_PARTNER', 'RESOLVED', 'REJECTED'];
const CLOSED = ['RESOLVED', 'REJECTED'];
const MAX_MESSAGE = 2000;
const notFound = (res) => res.status(404).json({ message: 'Không tìm thấy khiếu nại.' });
const guestNameOf = (booking) => (booking && ((!booking.isSelfGuest && booking.guestFullName) || booking.bookerFullName)) || '—';

const findOwnedDispute = (hotel, id) =>
  mongoose.isValidObjectId(id) ? Dispute.findOne({ _id: id, hotelId: hotel._id }) : null;

const toDetail = (dispute, booking, partnerId) => ({
  _id: dispute._id,
  bookingId: dispute.bookingId,
  bookingCode: dispute.bookingCode,
  category: dispute.category,
  status: dispute.status,
  description: dispute.description,
  createdAt: dispute.createdAt,
  updatedAt: dispute.updatedAt,
  // Bằng chứng khách gửi; không kèm email hay số điện thoại của khách
  attachments: (dispute.attachments || []).map(({ fileName, fileType, fileSize, fileUrl }) => ({ fileName, fileType, fileSize, fileUrl })),
  booking: booking && {
    guestName: guestNameOf(booking),
    checkInDate: vnDate(booking.checkInDate),
    checkOutDate: vnDate(booking.checkOutDate),
    totalAmount: booking.totalAmount,
    bookingStatus: booking.bookingStatus,
  },
  responses: (dispute.responses || []).map(({ message, respondedBy, respondedAt }) => ({
    message,
    respondedAt,
    from: respondedBy?.equals?.(partnerId) ? 'PARTNER' : 'PLATFORM',
  })),
  resolution: dispute.resolution?.resolvedAt
    ? { outcome: dispute.resolution.outcome, message: dispute.resolution.message, resolvedAt: dispute.resolution.resolvedAt }
    : null,
  canRespond: !CLOSED.includes(dispute.status),
});

export const getPartnerDisputes = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const { status } = req.query;
    if (status && !STATUSES.includes(status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ.' });

    const filter = { hotelId: hotel._id, ...(status && { status }) };
    const [total, waitingCount] = await Promise.all([
      Dispute.countDocuments(filter),
      Dispute.countDocuments({ hotelId: hotel._id, status: 'WAITING_PARTNER' }),
    ]);
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const page = Math.min(Math.max(1, Number(req.query.page) || 1), totalPages);
    const disputes = await Dispute.find(filter)
      .sort({ createdAt: -1, _id: 1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean();
    const bookings = await Booking.find({ _id: { $in: disputes.map((dispute) => dispute.bookingId) } })
      .select('bookerFullName guestFullName isSelfGuest checkInDate checkOutDate').lean();
    const bookingOf = (dispute) => bookings.find((booking) => booking._id.equals(dispute.bookingId));

    res.json({
      disputes: disputes.map((dispute) => {
        const booking = bookingOf(dispute);
        const partnerResponses = (dispute.responses || []).filter((item) => item.respondedBy?.equals(req.user._id));
        return {
          _id: dispute._id,
          bookingCode: dispute.bookingCode,
          guestName: guestNameOf(booking),
          checkInDate: booking ? vnDate(booking.checkInDate) : null,
          checkOutDate: booking ? vnDate(booking.checkOutDate) : null,
          category: dispute.category,
          status: dispute.status,
          createdAt: dispute.createdAt,
          responseCount: partnerResponses.length,
          lastRespondedAt: partnerResponses.at(-1)?.respondedAt || null,
        };
      }),
      waitingCount,
      pagination: { page, totalPages, total },
    });
  } catch (error) { next(error); }
};

export const getPartnerDispute = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const dispute = await findOwnedDispute(hotel, req.params.id)?.lean();
    if (!dispute) return notFound(res);
    const booking = await Booking.findById(dispute.bookingId)
      .select('bookerFullName guestFullName isSelfGuest checkInDate checkOutDate totalAmount bookingStatus').lean();
    res.json({ dispute: toDetail(dispute, booking, req.user._id) });
  } catch (error) { next(error); }
};

// Gửi phản hồi của khách sạn; không đổi kết luận, chỉ trả khiếu nại đang chờ khách sạn về cho Operations Manager
export const respondPartnerDispute = async (req, res, next) => {
  try {
    const hotel = await findApprovedHotel(req.user._id);
    if (!hotel) return notApproved(res);
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ message: 'Vui lòng nhập nội dung phản hồi.' });
    if (message.length > MAX_MESSAGE) return res.status(400).json({ message: `Nội dung phản hồi tối đa ${MAX_MESSAGE} ký tự.` });

    const dispute = await findOwnedDispute(hotel, req.params.id);
    if (!dispute) return notFound(res);
    if (CLOSED.includes(dispute.status)) return res.status(409).json({ message: 'Khiếu nại đã được đóng nên không thể phản hồi thêm.' });

    const previousStatus = dispute.status;
    // Cập nhật có điều kiện để không ghi đè khi Operations Manager vừa đóng khiếu nại
    const updated = await Dispute.findOneAndUpdate(
      { _id: dispute._id, hotelId: hotel._id, status: { $nin: CLOSED } },
      {
        $push: { responses: { message, respondedBy: req.user._id, respondedAt: new Date() } },
        ...(previousStatus === 'WAITING_PARTNER' && { $set: { status: 'IN_PROGRESS' } }),
      },
      { returnDocument: 'after' },
    ).lean();
    if (!updated) return res.status(409).json({ message: 'Khiếu nại đã được đóng nên không thể phản hồi thêm.' });

    await AuditLog.create({
      admin_id: req.user._id,
      action: 'DISPUTE_PARTNER_RESPONDED',
      entityType: 'DISPUTE',
      entityId: dispute._id,
      old_status: previousStatus,
      new_status: updated.status,
      metadata: { bookingCode: dispute.bookingCode, hotelId: hotel._id },
    });
    if (dispute.assignedTo) {
      await Notification.create({
        recipientId: dispute.assignedTo,
        title: 'Khách sạn đã phản hồi khiếu nại',
        message: `${hotel.name} đã phản hồi khiếu nại của đặt phòng ${dispute.bookingCode}.`,
        entityType: 'DISPUTE',
        entityId: dispute._id,
      });
    }

    const booking = await Booking.findById(dispute.bookingId)
      .select('bookerFullName guestFullName isSelfGuest checkInDate checkOutDate totalAmount bookingStatus').lean();
    res.status(201).json({ message: 'Đã gửi phản hồi đến bộ phận vận hành.', dispute: toDetail(updated, booking, req.user._id) });
  } catch (error) { next(error); }
};
