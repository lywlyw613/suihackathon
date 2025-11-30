/**
 * Vercel Serverless Function for User Profile Management
 * 
 * This endpoint handles CRUD operations for user profiles stored in MongoDB
 * 
 * Environment variables required:
 * - MONGODB_URI: MongoDB connection string
 */

import { MongoClient } from 'mongodb';

// MongoDB connection (cached)
let cachedClient: MongoClient | null = null;
let cachedDb: any = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    // Test if connection is still alive
    try {
      await cachedClient.db('admin').command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch (error) {
      // Connection is dead, reset cache
      cachedClient = null;
      cachedDb = null;
    }
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  // MongoDB Atlas connection options
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
    minPoolSize: 1,
    // Don't set tls options - let the connection string handle it
  });
  
  try {
    await client.connect();
  } catch (error: any) {
    console.error('MongoDB connection error:', error);
    // Don't throw - let the handler catch and return 503
    throw new Error(`Failed to connect to MongoDB: ${error.message}`);
  }
  const db = client.db('sui_chat');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export interface UserProfile {
  address: string; // Wallet address (primary key)
  name?: string; // Name from zkLogin (e.g., "Chung-Yang Ric Huang")
  avatarUrl?: string; // Walrus URL for avatar
  bannerUrl?: string; // Walrus URL for banner/background
  bio?: string; // Brief description
  chatroomCount?: number; // Number of chatrooms owned
  friends?: string[]; // Array of friend wallet addresses
  createdAt?: Date;
  updatedAt?: Date;
}

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const profilesCollection = db.collection('profiles');

    // GET - Get user profile
    if (req.method === 'GET') {
      const { address } = req.query;

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const profile = await profilesCollection.findOne({ address });
      
      if (!profile) {
        // Return default profile if not found
        return res.status(200).json({
          address,
          chatroomCount: 0,
          friends: [],
        });
      }

      return res.status(200).json(profile);
    }

    // POST/PUT - Create or update user profile
    if (req.method === 'POST' || req.method === 'PUT') {
      const profile: UserProfile = req.body;

      if (!profile.address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      // Security: Only allow users to update their own profile
      // In production, you should verify the wallet signature
      // For now, we rely on frontend check (isOwnProfile)
      // Backend should also verify, but for hackathon demo we'll trust the frontend
      
      const now = new Date();
      const updateData = {
        ...profile,
        updatedAt: now,
        ...(req.method === 'POST' && { createdAt: now }),
      };

      const result = await profilesCollection.updateOne(
        { address: profile.address },
        { $set: updateData },
        { upsert: true }
      );

      return res.status(200).json({
        success: true,
        address: profile.address,
        updated: result.modifiedCount > 0,
        created: result.upsertedCount > 0,
      });
    }

    // DELETE - Delete user profile
    if (req.method === 'DELETE') {
      const { address } = req.query;

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const result = await profilesCollection.deleteOne({ address });

      return res.status(200).json({
        success: true,
        deleted: result.deletedCount > 0,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Profile API error:', error);
    
    // Handle MongoDB connection errors more gracefully
    if (error.message?.includes('SSL') || error.message?.includes('TLS') || error.message?.includes('MongoDB')) {
      return res.status(503).json({
        error: 'Database connection error',
        message: 'Unable to connect to database. Please try again later.',
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
}

