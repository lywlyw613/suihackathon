/**
 * Vercel Serverless Function for Friends Management
 * 
 * This endpoint handles friend relationships
 */

import { MongoClient } from 'mongodb';

// MongoDB connection (cached) - same as profile.ts
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

  // Don't set tls explicitly - MongoDB Atlas connection string already includes TLS info
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

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { db } = await connectToDatabase();
    const profilesCollection = db.collection('profiles');
    
    console.log('Friends API request:', { method: req.method, body: req.body, query: req.query });

    // GET - Get friends list for a user
    if (req.method === 'GET') {
      const { address } = req.query;

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      const profile = await profilesCollection.findOne({ address });
      const friendAddresses = profile?.friends || [];

      // Get friend profiles
      const friends = await profilesCollection
        .find({ address: { $in: friendAddresses } })
        .toArray();

      return res.status(200).json({
        friends: friends.map((f: any) => ({
          address: f.address,
          name: f.name,
          avatarUrl: f.avatarUrl,
          bio: f.bio,
        })),
        count: friends.length,
      });
    }

    // POST - Add a friend
    if (req.method === 'POST') {
      try {
        const { address, friendAddress } = req.body;

        console.log('Add friend request:', { address, friendAddress });

        if (!address || !friendAddress) {
          console.error('Missing required fields:', { address: !!address, friendAddress: !!friendAddress });
          return res.status(400).json({ error: 'Address and friendAddress are required' });
        }

        if (address === friendAddress) {
          return res.status(400).json({ error: 'Cannot add yourself as a friend' });
        }

        // Check if profile exists
        let profile = await profilesCollection.findOne({ address });
        console.log('Current profile:', profile ? { address: profile.address, friendsCount: profile.friends?.length || 0, hasFriends: !!profile.friends } : 'not found');
        
        // Check if friend already exists
        if (profile?.friends && Array.isArray(profile.friends) && profile.friends.includes(friendAddress)) {
          return res.status(200).json({
            success: true,
            added: false,
            message: "Friend already added",
          });
        }

        // If profile doesn't exist, create it first
        if (!profile) {
          const insertResult = await profilesCollection.insertOne({
            address,
            name: '',
            bio: '',
            avatarUrl: '',
            bannerUrl: '',
            friends: [friendAddress],
            chatroomCount: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          console.log('Created new profile:', insertResult.insertedId);
          
          return res.status(200).json({
            success: true,
            added: true,
            message: "Friend added successfully",
          });
        }

        // Profile exists, ensure friends array exists and add friend
        // First, ensure friends field is an array
        if (!profile.friends || !Array.isArray(profile.friends)) {
          await profilesCollection.updateOne(
            { address },
            { $set: { friends: [] } }
          );
        }

        // Now add the friend
        const result = await profilesCollection.updateOne(
          { address },
          {
            $addToSet: { friends: friendAddress },
            $set: {
              updatedAt: new Date(),
            },
          }
        );

        console.log('Update result:', {
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        });

        if (result.matchedCount === 0) {
          return res.status(404).json({
            error: 'Profile not found',
            message: 'Profile was not found after creation attempt',
          });
        }
        
        return res.status(200).json({
          success: true,
          added: result.modifiedCount > 0,
          message: result.modifiedCount > 0 ? "Friend added successfully" : "Friend already exists",
        });
      } catch (postError: any) {
        console.error('Error in POST /api/friends:', postError);
        console.error('Error stack:', postError.stack);
        throw postError; // Re-throw to be caught by outer catch
      }
    }

    // DELETE - Remove a friend
    if (req.method === 'DELETE') {
      const { address, friendAddress } = req.query;

      if (!address || !friendAddress) {
        return res.status(400).json({ error: 'Address and friendAddress are required' });
      }

      const result = await profilesCollection.updateOne(
        { address },
        { $pull: { friends: friendAddress } }
      );

      return res.status(200).json({
        success: true,
        removed: result.modifiedCount > 0,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('Friends API error:', error);
    
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

