/**
 * Vercel Serverless Function for getting gas payment info for sponsored transactions
 * 
 * This endpoint returns gas payment information that the frontend needs
 * to set in the transaction before user signs it.
 * 
 * Environment variables required:
 * - SPONSOR_PRIVATE_KEY: Sponsor's private key
 * - SUI_NETWORK: Network to use (devnet, testnet, mainnet)
 */

import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { fromHEX } from '@mysten/sui/utils';

export default async function handler(req: any, res: any) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get sponsor private key from environment
    const sponsorPrivateKey = process.env.SPONSOR_PRIVATE_KEY;
    if (!sponsorPrivateKey) {
      return res.status(500).json({ error: 'Sponsor private key not configured' });
    }

    // Get network (default to devnet)
    const network = (process.env.SUI_NETWORK || 'devnet') as 'mainnet' | 'testnet' | 'devnet' | 'localnet';
    const rpcUrl = getFullnodeUrl(network);
    const client = new SuiClient({ url: rpcUrl });

    // Create sponsor keypair from private key
    let sponsorKeypair: Ed25519Keypair;
    try {
      if (sponsorPrivateKey.startsWith('suiprivkey')) {
        sponsorKeypair = Ed25519Keypair.fromSecretKey(sponsorPrivateKey);
      } else {
        sponsorKeypair = Ed25519Keypair.fromSecretKey(fromHEX(sponsorPrivateKey));
      }
    } catch (error: any) {
      return res.status(500).json({ 
        error: 'Invalid sponsor private key format',
        message: error.message 
      });
    }
    const sponsorAddress = sponsorKeypair.toSuiAddress();

    // Get sponsor coins for gas payment
    const sponsorCoins = await client.getCoins({
      owner: sponsorAddress,
      coinType: '0x2::sui::SUI',
    });

    if (sponsorCoins.data.length === 0) {
      return res.status(500).json({ 
        error: 'Sponsor has no SUI coins to pay for gas',
        sponsorAddress 
      });
    }

    // Use the first coin for gas
    const gasCoin = sponsorCoins.data[0];

    return res.status(200).json({
      sponsorAddress,
      gasCoin: {
        objectId: gasCoin.coinObjectId,
        version: gasCoin.version,
        digest: gasCoin.digest,
      },
    });
  } catch (error: any) {
    console.error('Error getting gas info:', error);
    return res.status(500).json({
      error: 'Failed to get gas info',
      message: error.message,
    });
  }
}

