import { MongoClient, Collection } from 'mongodb';

// MongoDB connection (cached)
let cachedClient: MongoClient | null = null;
let cachedDb: any = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedDb.command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch (error) {
      console.warn("Cached MongoDB connection lost, reconnecting...", error);
      cachedClient = null;
      cachedDb = null;
    }
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(uri, {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
  });
  await client.connect();
  const db = client.db('sui_chat');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

interface ChatroomName {
  walletAddress: string;
  chatroomId: string;
  customName: string;
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
    const chatroomNamesCollection: Collection<ChatroomName> = db.collection('chatroom_names');

    // GET - Get chatroom names for a wallet, or a specific chatroom name
    if (req.method === 'GET') {
      const { walletAddress, chatroomId } = req.query;

      if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
      }

      if (chatroomId) {
        // Get specific chatroom name
        const nameRecord = await chatroomNamesCollection.findOne({
          walletAddress,
          chatroomId,
        });

        return res.status(200).json({
          walletAddress,
          chatroomId,
          customName: nameRecord?.customName || null,
        });
      } else {
        // Get all chatroom names for this wallet
        const nameRecords = await chatroomNamesCollection
          .find({ walletAddress })
          .toArray();

        const namesMap: Record<string, string> = {};
        nameRecords.forEach((record) => {
          namesMap[record.chatroomId] = record.customName;
        });

        return res.status(200).json({
          walletAddress,
          names: namesMap,
        });
      }
    }

    // POST/PUT - Create or update chatroom name
    if (req.method === 'POST' || req.method === 'PUT') {
      const { walletAddress, chatroomId, customName } = req.body;

      if (!walletAddress || !chatroomId) {
        return res.status(400).json({ error: 'Wallet address and chatroom ID are required' });
      }

      if (!customName || customName.trim().length === 0) {
        return res.status(400).json({ error: 'Custom name is required' });
      }

      const now = new Date();
      const updateData = {
        walletAddress,
        chatroomId,
        customName: customName.trim(),
        updatedAt: now,
      };

      const result = await chatroomNamesCollection.updateOne(
        { walletAddress, chatroomId },
        { 
          $set: updateData,
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );

      return res.status(200).json({
        success: true,
        walletAddress,
        chatroomId,
        customName: customName.trim(),
        updated: result.modifiedCount > 0,
        created: result.upsertedCount > 0,
      });
    }

    // DELETE - Remove chatroom name
    if (req.method === 'DELETE') {
      const { walletAddress, chatroomId } = req.query;

      if (!walletAddress || !chatroomId) {
        return res.status(400).json({ error: 'Wallet address and chatroom ID are required' });
      }

      const result = await chatroomNamesCollection.deleteOne({
        walletAddress,
        chatroomId,
      });

      return res.status(200).json({
        success: true,
        deleted: result.deletedCount > 0,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Chatroom names API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}

