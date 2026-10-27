import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Booking from '../src/models/Booking.js';
import CommissionPolicy from '../src/models/CommissionPolicy.js';
import Dispute from '../src/models/Dispute.js';
import Hotel from '../src/models/Hotel.js';
import HotelVerification from '../src/models/HotelVerification.js';
import RefundRequest from '../src/models/RefundRequest.js';
import User from '../src/models/User.js';

dotenv.config();

const ensureUser = async ({ email, fullName, role, password }) => {
  const existing = await User.findOne({ email });
  if (existing) return existing;
  return User.create({ email, fullName, role, password, status: 'ACTIVE' });
};

const seed = async () => {
  if (!process.env.SEED_OM_PASSWORD) throw new Error('Set SEED_OM_PASSWORD in backend/.env before running this script.');
  await connectDB();
  const manager = await ensureUser({ email: process.env.SEED_OM_EMAIL || 'operations.manager@vinastay.local', fullName: 'Operations Manager', role: 'OPERATIONS_MANAGER', password: process.env.SEED_OM_PASSWORD });
  const partner = await ensureUser({ email: 'partner.demo@vinastay.local', fullName: 'Demo Hotel Partner', role: 'HOTEL_PARTNER', password: 'Partner_Test_2026!' });
  const customer = await ensureUser({ email: 'customer.demo@vinastay.local', fullName: 'Demo Customer', role: 'CUSTOMER', password: 'Customer_Test_2026!' });

  let hotel = await Hotel.findOne({ ownerId: partner._id, name: 'VinaStay OM Demo Hotel' });
  if (!hotel) hotel = await Hotel.create({ ownerId: partner._id, name: 'VinaStay OM Demo Hotel', provinceCity: 'Ha Noi', address: '1 Demo Street, Hoan Kiem, Ha Noi', description: 'Demo hotel for Operations Manager workflow testing.', starRating: 4, cancellationPolicy: 'one', status: 'PENDING_VERIFICATION', verificationStatus: 'PENDING', roomTypes: [{ name: 'Demo Deluxe Room', adultCapacity: 2, childrenCapacity: 1, totalRooms: 10, basePrice: 1000000 }] });
  const verification = await HotelVerification.findOne({ hotelId: hotel._id });
  if (!verification) await HotelVerification.create({ hotelId: hotel._id, partnerId: partner._id, documents: [{ name: 'Business registration', url: 'https://example.com/demo-business-registration.pdf', type: 'application/pdf' }], history: [{ action: 'SEEDED', note: 'Demo hotel registration awaiting review.' }] });

  let booking = await Booking.findOne({ bookingCode: 'OM-DEMO-BOOKING-001' });
  if (!booking) booking = await Booking.create({ bookingCode: 'OM-DEMO-BOOKING-001', customerId: customer._id, hotelId: hotel._id.toString(), hotelName: hotel.name, hotelAddress: hotel.address, bookerInfo: { fullName: customer.fullName, phoneNumber: '0900000000', email: customer.email }, checkInDate: new Date('2026-10-10T07:00:00.000Z'), checkOutDate: new Date('2026-10-12T05:00:00.000Z'), totalNights: 2, bookingDetails: [{ roomTypeId: hotel.roomTypes[0]._id.toString(), roomTypeName: 'Demo Deluxe Room', quantity: 1, pricePerNight: 1000000, totalPrice: 2000000 }], totalAmount: 2000000, bookingStatus: 'COMPLETED', paymentStatus: 'PAID' });
  let dispute = await Dispute.findOne({ bookingId: booking._id });
  if (!dispute) dispute = await Dispute.create({ bookingId: booking._id, bookingCode: booking.bookingCode, customerId: customer._id, hotelId: hotel._id, partnerId: partner._id, category: 'SERVICE_QUALITY', description: 'Demo dispute for Operations Manager testing.' });
  if (!(await RefundRequest.exists({ bookingId: booking._id }))) await RefundRequest.create({ bookingId: booking._id, disputeId: dispute._id, customerId: customer._id, hotelId: hotel._id, partnerId: partner._id, requestedAmount: 500000, reason: 'Demo refund request for Operations Manager testing.' });
  if (!(await CommissionPolicy.exists({ scope: 'GLOBAL', status: 'ACTIVE' }))) await CommissionPolicy.create({ name: 'Standard VinaStay commission', calculationType: 'PERCENTAGE', value: 12, scope: 'GLOBAL', effectiveFrom: new Date(), createdBy: manager._id });
  console.log(`Operations Manager demo data is ready for ${manager.email}.`);
  await mongoose.disconnect();
};

seed().catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exit(1); });
