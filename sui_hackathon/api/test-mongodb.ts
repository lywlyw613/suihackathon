/**
 * Test MongoDB Connection
 * 
 * This endpoint tests the MongoDB connection
 * GET /api/test-mongodb
 */

import { MongoClient } from 'mongodb';

export default async function handler(req: any, res: any) {
  // Set CORS headers
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

    // Test connection
    const client = new MongoClient(uri);
    await client.connect();
    
    // Test database access
    const db = client.db('sui_chat');
    const collections = await db.listCollections().toArray();
    
    // Test write operation
    const testCollection = db.collection('test');
    const testResult = await testCollection.insertOne({
      test: true,
      timestamp: new Date(),
    });
    
    // Clean up test document
    await testCollection.deleteOne({ _id: testResult.insertedId });
    
    await client.close();

    return res.status(200).json({
      success: true,
      message: 'MongoDB connection successful',
      database: 'sui_chat',
      collections: collections.map((c) => c.name),
      testWrite: 'success',
    });
  } catch (error: any) {
    console.error('MongoDB test error:', error);
    return res.status(500).json({
      error: 'MongoDB connection failed',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}

