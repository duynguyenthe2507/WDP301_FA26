import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../src/config/db.js';
import Hotel from '../src/models/Hotel.js';
import User from '../src/models/User.js';

dotenv.config();

const migrate = async () => {
  await connectDB();
  try {
    await Hotel.collection.dropIndex('ownerId_1');
    console.log('Removed legacy unique index ownerId_1.');
  } catch (error) {
    if (error.codeName !== 'IndexNotFound') throw error;
  }
  await Hotel.updateMany({ status: 'PENDING' }, { $set: { status: 'PENDING_VERIFICATION', verificationStatus: 'PENDING' } });
  await Hotel.updateMany({ status: 'ACTIVE' }, { $set: { status: 'APPROVED', verificationStatus: 'APPROVED' } });
  await Hotel.updateMany({ status: 'APPROVED', verificationStatus: { $exists: false } }, { $set: { verificationStatus: 'APPROVED', verificationUpdatedAt: new Date() } });
  await User.updateMany({ role: 'PARTNER' }, { $set: { role: 'HOTEL_PARTNER' } });
  await User.updateMany({ role: 'STAFF' }, { $set: { role: 'OPERATIONS_MANAGER' } });
  console.log('Operations Manager hotel migration completed.');
  await mongoose.disconnect();
};

migrate().catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exit(1); });
