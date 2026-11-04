const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const config = require('../config/env');

const uploadDirectory = path.resolve(__dirname, '../../private-uploads/onboarding');
fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, uploadDirectory),
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    callback(null, `${crypto.randomUUID()}${extension}`);
  }
});

const uploadSupportingDocument = multer({
  storage,
  limits: { fileSize: config.MAX_FILE_SIZE_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const supportedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    if (!supportedTypes.has(file.mimetype)) {
      const error = new Error('Supporting document must be a PDF, JPEG, or PNG file.');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  }
}).single('supportingDocument');

module.exports = { uploadSupportingDocument, uploadDirectory };
