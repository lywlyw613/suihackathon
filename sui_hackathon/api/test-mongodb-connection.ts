/**
 * Test MongoDB Connection Endpoint
 * 
 * This endpoint helps diagnose MongoDB connection issues
 */

import { MongoClient } from 'mongodb';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
      return res.status(500).json({
        error: 'MONGODB_URI not configured',
        message: 'MONGODB_URI environment variable is not set',
      });
    }

    // Log connection string (without password) for debugging
    const uriWithoutPassword = uri.replace(/:[^:@]+@/, ':****@');
    console.log('Attempting to connect to MongoDB:', uriWithoutPassword);

    const client = new MongoClient(uri, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000,
    });

    const startTime = Date.now();
    await client.connect();
    const connectTime = Date.now() - startTime;

    // Test the connection
    const db = client.db('sui_chat');
    await db.command({ ping: 1 });

    // List collections
    const collections = await db.listCollections().toArray();

    await client.close();

    return res.status(200).json({
      success: true,
      message: 'MongoDB connection successful',
      connectTime: `${connectTime}ms`,
      database: 'sui_chat',
      collections: collections.map((c) => c.name),
    });
  } catch (error: any) {
    console.error('MongoDB test error:', error);
    return res.status(500).json({
      error: 'MongoDB connection failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      errorType: error.constructor.name,
    });
  }
}

