/**
 * Walrus Integration for Sui
 * 
 * Walrus is a decentralized image storage service on Sui.
 * This module provides utilities for uploading and retrieving images from Walrus.
 * 
 * Documentation: https://walrus.gg/
 */

/**
 * Upload an image to Walrus
 * 
 * @param file - The image file to upload
 * @param walletAddress - The wallet address of the uploader
 * @returns Promise<string> - The Walrus URL of the uploaded image
 */
export async function uploadImageToWalrus(
  file: File,
  walletAddress: string
): Promise<string> {
  try {
    // Create FormData
    const formData = new FormData();
    formData.append('file', file);
    formData.append('address', walletAddress);

    // Upload to Walrus API
    // Note: The actual API endpoint may vary. Check Walrus documentation for the latest endpoint.
    const response = await fetch('https://api.walrus.gg/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Walrus upload failed: ${error}`);
    }

    const data = await response.json();
    
    // Walrus typically returns an object with a URL or hash
    // Adjust this based on actual Walrus API response format
    return data.url || data.hash || data.imageUrl;
  } catch (error) {
    console.error('Error uploading to Walrus:', error);
    throw error;
  }
}

/**
 * Get Walrus image URL from hash or object ID
 * 
 * @param hashOrId - The hash or object ID from Walrus
 * @returns string - The full URL to the image
 */
export function getWalrusImageUrl(hashOrId: string): string {
  // Walrus typically serves images from a CDN
  // Format: https://walrus.gg/image/{hash} or similar
  // Adjust this based on actual Walrus URL format
  if (hashOrId.startsWith('http')) {
    return hashOrId;
  }
  return `https://walrus.gg/image/${hashOrId}`;
}

/**
 * Validate image file
 * 
 * @param file - The file to validate
 * @returns boolean - Whether the file is valid
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return { valid: false, error: 'Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.' };
  }

  // Check file size (max 10MB)
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 10MB limit.' };
  }

  return { valid: true };
}

/**
 * Create a data URL from a file (for preview)
 * 
 * @param file - The file to create a data URL from
 * @returns Promise<string> - The data URL
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

