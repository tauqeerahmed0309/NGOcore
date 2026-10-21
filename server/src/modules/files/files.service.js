const fs = require('fs');
const path = require('path');
const { File } = require('./model');
const { Record } = require('../records/model');
const { AuditLog } = require('../audit/model');
const { AppError } = require('../../utils/errors');
const cloudinary = require('../../config/cloudinary');

class FilesService {
  /**
   * Save uploaded file metadata to database and log audit trail
   */
  async saveFileMetadata({ ngoId, file, recordId = null, tags = [], user = null, ip = null, userAgent = null }) {
    if (!file) {
      throw new AppError(400, 'File object is required');
    }

    const isCloudinary = Boolean(file.path && file.path.startsWith('http'));
    const url = isCloudinary ? file.path : `/uploads/${file.filename || path.basename(file.path)}`;
    const publicId = file.filename || file.public_id || `${Date.now()}-${file.originalname}`;
    const storageProvider = isCloudinary ? 'cloudinary' : 'local';

    const fileDoc = await File.create({
      ngoId,
      originalName: file.originalname,
      fileName: file.filename || path.basename(file.path),
      mimeType: file.mimetype,
      size: file.size,
      url,
      publicId,
      fileHash: file.sha256Hash || 'sha256-uncalculated',
      storageProvider,
      uploadedBy: user?._id || null,
      recordId: recordId || null,
      tags: Array.isArray(tags) ? tags : []
    });

    // Write deterministic cryptographic audit log
    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'FILE_UPLOADED',
        resource: 'files',
        resourceId: fileDoc._id,
        details: {
          originalName: fileDoc.originalName,
          size: fileDoc.size,
          mimeType: fileDoc.mimeType,
          fileHash: fileDoc.fileHash,
          recordId
        },
        ip,
        userAgent
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return fileDoc;
  }

  /**
   * Query paginated files for an NGO tenant
   */
  async getFiles(ngoId, { recordId, search, page = 1, limit = 20 } = {}) {
    const query = { ngoId, isArchived: false };

    if (recordId) {
      query.recordId = recordId;
    }

    if (search) {
      query.originalName = new RegExp(search, 'i');
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [files, total] = await Promise.all([
      File.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('uploadedBy', 'name email designation')
        .populate('recordId', 'recordNumber status')
        .lean(),
      File.countDocuments(query)
    ]);

    return {
      files,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get single file by ID
   */
  async getFileById(ngoId, fileId) {
    const file = await File.findOne({ _id: fileId, ngoId, isArchived: false })
      .populate('uploadedBy', 'name email')
      .populate('recordId', 'recordNumber status');

    if (!file) {
      throw new AppError(404, 'File not found');
    }

    return file;
  }

  /**
   * Delete file from storage and archive file metadata
   */
  async deleteFile(ngoId, fileId, user = null, ip = null, userAgent = null) {
    const file = await File.findOne({ _id: fileId, ngoId, isArchived: false });
    if (!file) {
      throw new AppError(404, 'File not found');
    }

    // Attempt physical deletion from local storage or Cloudinary
    try {
      if (file.storageProvider === 'cloudinary' && file.publicId) {
        await cloudinary.uploader.destroy(file.publicId);
      } else if (file.storageProvider === 'local') {
        const localPath = path.join(__dirname, '../../../uploads', file.fileName);
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      }
    } catch (err) {
      console.warn('Physical file cleanup notice:', err.message);
    }

    file.isArchived = true;
    await file.save();

    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'FILE_DELETED',
        resource: 'files',
        resourceId: file._id,
        details: {
          originalName: file.originalName,
          fileHash: file.fileHash
        },
        ip,
        userAgent
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return { success: true, message: 'File deleted successfully' };
  }
}

module.exports = new FilesService();
