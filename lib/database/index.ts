// utils/mongodb.ts

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI is missing from environment variables');
  throw new Error('MONGODB_URI is missing from environment variables');
}

let cached = (global as any).mongoose || { conn: null, promise: null };

export const connectToDatabase = async () => {
  try {
    // If already connected, return the existing connection
    if (cached.conn && mongoose.connection.readyState === 1) {
      console.log('Using existing MongoDB connection');
      return cached.conn;
    }

    // If there's an existing connection but it's not ready, wait for it
    if (mongoose.connection.readyState === 2) {
      console.log('Waiting for existing MongoDB connection...');
      await new Promise((resolve) => {
        mongoose.connection.once('connected', resolve);
      });
      cached.conn = mongoose.connection;
      return cached.conn;
    }

    // If there's an existing connection but it's not to our database, disconnect first
    if (mongoose.connection.readyState !== 0) {
      console.log('Disconnecting from existing MongoDB connection...');
      await mongoose.disconnect();
    }

    // Create new connection if no cached promise exists
    if (!cached.promise) {
      console.log('Creating new MongoDB connection...');
      const options = {
        dbName: 'offset-shop',
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000, // Reduced to 5 seconds for faster failure detection
        socketTimeoutMS: 30000, // 30 seconds
        connectTimeoutMS: 10000, // 10 seconds connection timeout
        maxPoolSize: 20, // Increased pool size
        minPoolSize: 2, // Reduced minimum pool size
        maxIdleTimeMS: 30000, // 30 seconds idle timeout
        retryWrites: true,
        retryReads: true,
        // Optimize for serverless environments
        useNewUrlParser: true,
        useUnifiedTopology: true,
      };
      
      cached.promise = mongoose.connect(MONGODB_URI, options);
    }

    cached.conn = await cached.promise;
    console.log('Connected to MongoDB successfully');
    
    // Ensure all models are registered after connection
    try {
      // Import all models to ensure they're registered
      await import('./models');
      console.log('All models registered successfully');
    } catch (modelError) {
      console.warn('Model registration warning:', modelError);
    }
    
    return cached.conn;
  } catch (error) {
    // Reset the cached promise if connection fails
    cached.promise = null;
    console.error('MongoDB connection error:', error);
    console.error('MongoDB URI (first 20 chars):', MONGODB_URI?.substring(0, 20) + '...');
    throw error;
  }
};

// Optional: Export a disconnect function for cleanup
export const disconnectFromDatabase = async () => {
  if (cached.conn) {
    await mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
    console.log('Disconnected from MongoDB');
  }
};