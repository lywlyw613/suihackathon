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
    return { client: cachedClient, db: cachedDb };
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(uri);
  await client.connect();
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
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

