const filesService = require('./files.service');
const { sendSuccess } = require('../../utils/response');

class FilesController {
  async uploadFile(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const { recordId, tags } = req.body;

      const fileDoc = await filesService.saveFileMetadata({
        ngoId: req.ngoId,
        file: req.file,
        recordId,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',')) : [],
        user: req.user,
        ip,
        userAgent
      });

      return sendSuccess(res, 201, 'File uploaded and secured successfully', fileDoc);
    } catch (err) {
      next(err);
    }
  }

  async getFiles(req, res, next) {
    try {
      const { recordId, search, page, limit } = req.query;
      const result = await filesService.getFiles(req.ngoId, {
        recordId,
        search,
        page,
        limit
      });
      return sendSuccess(res, 200, 'Files retrieved', result);
    } catch (err) {
      next(err);
    }
  }

  async getFileById(req, res, next) {
    try {
      const file = await filesService.getFileById(req.ngoId, req.params.id);
      return sendSuccess(res, 200, 'File details retrieved', file);
    } catch (err) {
      next(err);
    }
  }

  async deleteFile(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const result = await filesService.deleteFile(
        req.ngoId,
        req.params.id,
        req.user,
        ip,
        userAgent
      );
      return sendSuccess(res, 200, 'File deleted successfully', result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new FilesController();
