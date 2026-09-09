import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './src/config/db.js';

// Import Routes
import customerRoutes from './src/routes/customerRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import partnerRoutes from './src/routes/partnerRoutes.js';
import managerRoutes from './src/routes/managerRoutes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 9999;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Connect to Database
connectDB();

// API Routes
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/partner', partnerRoutes);
app.use('/api/manager', managerRoutes);

// Base Route
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hovi Hotel Booking API is running!' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(` Server is running on port: ${PORT}`);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Stop the old server or choose another PORT.`);
    process.exit(1);
  }
  console.error('Server failed:', error.message);
  process.exit(1);
});
