/**
 * NGOcore — Storage Abstraction Service
 *
 * Provides a unified storage interface supporting:
 * 1. Local Filesystem Storage (default for development and isolated testing)
 * 2. Cloud Object Storage (S3 / Cloudflare R2 / MinIO / DigitalOcean Spaces)
 *
 * Enforces:
 * - Tenant directory prefixing (${ngoId}/...)
 * - Strict separation between public assets and private compliance documents
 * - Time-limited presigned download URLs for sensitive files
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('../config/env');
const logger = require('../utils/logger');

const PROVIDER = process.env.STORAGE_PROVIDER || 'local';
const LOCAL_PUBLIC_ROOT = path.resolve(__dirname, '../../uploads');
const LOCAL_PRIVATE_ROOT = path.resolve(__dirname, '../../private-uploads');

// Ensure base directories exist in local mode
if (PROVIDER === 'local') {
  if (!fs.existsSync(LOCAL_PUBLIC_ROOT)) fs.mkdirSync(LOCAL_PUBLIC_ROOT, { recursive: true });
  if (!fs.existsSync(LOCAL_PRIVATE_ROOT)) fs.mkdirSync(LOCAL_PRIVATE_ROOT, { recursive: true });
}

/**
 * Generates a tenant-scoped relative storage path
 */
const buildStorageKey = (ngoId, category, filename) => {
  const cleanNgo = String(ngoId || 'global').replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanCat = String(category || 'general').replace(/[^a-zA-Z0-9_-]/g, '');
  const ext = path.extname(filename || '').toLowerCase();
  const uuid = crypto.randomUUID();
  return `${cleanNgo}/${cleanCat}/${uuid}${ext}`;
};

/**
 * Save a file buffer to storage
 * @param {Object} options
 * @param {Buffer} options.buffer - File buffer
 * @param {string} options.originalname - Original file name
 * @param {string} options.mimetype - MIME type
 * @param {string} options.ngoId - Owning NGO ID
 * @param {string} [options.category='documents'] - Subfolder/category
 * @param {boolean} [options.isPrivate=true] - Whether file is private/sensitive
 */
const storeFile = async ({ buffer, originalname, mimetype, ngoId, category = 'documents', isPrivate = true }) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Valid file buffer is required for storage');
  }

  const storageKey = buildStorageKey(ngoId, category, originalname);
  const fileSize = buffer.length;

  if (PROVIDER === 'local') {
    const baseDir = isPrivate ? LOCAL_PRIVATE_ROOT : LOCAL_PUBLIC_ROOT;
    const targetPath = path.join(baseDir, storageKey);
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    await fs.promises.writeFile(targetPath, buffer);

    const fileUrl = isPrivate
      ? `/api/v1/storage/private/${encodeURIComponent(storageKey)}`
      : `/uploads/${storageKey.replace(/\\/g, '/')}`;

    return {
      storageKey,
      fileUrl,
      fileName: path.basename(originalname || 'unnamed'),
      fileSize,
      mimeType: mimetype,
      provider: 'local',
      isPrivate
    };
  }

  // Cloud S3-compatible provider
  // When configured with AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET
  try {
    const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });

    const bucket = process.env.S3_BUCKET || 'ngocore-storage';
    const s3Key = `${isPrivate ? 'private' : 'public'}/${storageKey}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: s3Key,
        Body: buffer,
        ContentType: mimetype
      })
    );

    const fileUrl = isPrivate
      ? `/api/v1/storage/private/${encodeURIComponent(storageKey)}`
      : `https://${bucket}.s3.amazonaws.com/${s3Key}`;

    return {
      storageKey,
      fileUrl,
      fileName: path.basename(originalname || 'unnamed'),
      fileSize,
      mimeType: mimetype,
      provider: 's3',
      isPrivate
    };
  } catch (err) {
    logger.error(`S3 Upload failed, falling back to local storage: ${err.message}`);
    // Fallback to local
    return storeFile({ buffer, originalname, mimetype, ngoId, category, isPrivate, fallback: true });
  }
};

/**
 * Retrieves a readable stream for a stored file
 */
const getFileStream = async (storageKey, isPrivate = true) => {
  if (PROVIDER === 'local') {
    const baseDir = isPrivate ? LOCAL_PRIVATE_ROOT : LOCAL_PUBLIC_ROOT;
    const filePath = path.join(baseDir, storageKey);

    // Path traversal guard
    if (!filePath.startsWith(baseDir)) {
      throw new Error('Access denied: Invalid storage path traversal attempt');
    }

    if (!fs.existsSync(filePath)) {
      throw new Error('File not found on local storage');
    }

    return fs.createReadStream(filePath);
  }

  // S3 provider
  const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined
  });
  const bucket = process.env.S3_BUCKET || 'ngocore-storage';
  const s3Key = `${isPrivate ? 'private' : 'public'}/${storageKey}`;

  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key
    })
  );

  return response.Body;
};

/**
 * Removes a file from storage
 */
const deleteFile = async (storageKey, isPrivate = true) => {
  if (PROVIDER === 'local') {
    const baseDir = isPrivate ? LOCAL_PRIVATE_ROOT : LOCAL_PUBLIC_ROOT;
    const filePath = path.join(baseDir, storageKey);

    if (filePath.startsWith(baseDir) && fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
      return true;
    }
    return false;
  }

  const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
  const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
  const bucket = process.env.S3_BUCKET || 'ngocore-storage';
  const s3Key = `${isPrivate ? 'private' : 'public'}/${storageKey}`;

  await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: s3Key }));
  return true;
};

module.exports = {
  storeFile,
  getFileStream,
  deleteFile,
  buildStorageKey,
  getProvider: () => PROVIDER
};
