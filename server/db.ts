import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { storage } from './storage.js';

dotenv.config();

export async function initDatabase() {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri && mongoUri.trim() !== '') {
    try {
      console.log(`Attempting connection to MongoDB at: ${mongoUri.replace(/:[^:]*@/, ':****@')}`);
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 2000
      });
      console.log('MongoDB successfully connected via Mongoose.');
      storage.setMongoConnected(true);
    } catch (err: any) {
      console.warn(`MongoDB connection unavailable (${err.message}). Active fallback: Local JSON persistence engine with identical Mongoose schema rules, compound indexes, and audit trail.`);
      storage.setMongoConnected(false);
    }
  } else {
    console.log('No MONGODB_URI specified. Operating with persistent disk storage engine.');
    storage.setMongoConnected(false);
  }
}
