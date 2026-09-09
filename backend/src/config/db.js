import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const MONGO_URL = process.env.MONGO_URL;
    if (!MONGO_URL) {
      console.error('Missing MONGO_URL in .env');
      process.exit(1);
    }
    
    await mongoose.connect(MONGO_URL, {
      dbName: process.env.DB_NAME || 'hovi_hotel',
    });
    
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};
