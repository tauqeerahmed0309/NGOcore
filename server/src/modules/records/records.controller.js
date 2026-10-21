const recordsService = require('./records.service');
const { sendSuccess } = require('../../utils/response');

class RecordsController {
  async getRecordTypes(req, res, next) {
    try {
      const types = await recordsService.getRecordTypes(req.ngoId);
      return sendSuccess(res, 200, 'Record types retrieved', types);
    } catch (err) {
      next(err);
    }
  }

  async createRecordType(req, res, next) {
    try {
      const newType = await recordsService.createRecordType(req.ngoId, req.body, req.user);
      return sendSuccess(res, 201, 'Record type created successfully', newType);
    } catch (err) {
      next(err);
    }
  }

  async seedPredefined(req, res, next) {
    try {
      const seeded = await recordsService.seedPredefinedRecordTypes(req.ngoId);
      return sendSuccess(res, 200, 'Predefined record types seeded successfully', seeded);
    } catch (err) {
      next(err);
    }
  }

  async getRecords(req, res, next) {
    try {
      const { recordTypeId, status, search, page, limit, sort } = req.query;
      const result = await recordsService.getRecords(req.ngoId, {
        recordTypeId,
        status,
        search,
        page,
        limit,
        sort
      });
      return sendSuccess(res, 200, 'Records retrieved', result);
    } catch (err) {
      next(err);
    }
  }

  async getRecordById(req, res, next) {
    try {
      const record = await recordsService.getRecordById(req.ngoId, req.params.id);
      return sendSuccess(res, 200, 'Record retrieved', record);
    } catch (err) {
      next(err);
    }
  }

  async createRecord(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const record = await recordsService.createRecord(
        req.ngoId,
        req.body,
        req.user,
        ip,
        userAgent
      );
      return sendSuccess(res, 201, 'Record created successfully', record);
    } catch (err) {
      next(err);
    }
  }

  async updateRecord(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const updated = await recordsService.updateRecord(
        req.ngoId,
        req.params.id,
        req.body,
        req.user,
        ip,
        userAgent
      );
      return sendSuccess(res, 200, 'Record updated successfully', updated);
    } catch (err) {
      next(err);
    }
  }

  async deleteRecord(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const result = await recordsService.deleteRecord(
        req.ngoId,
        req.params.id,
        req.user,
        ip,
        userAgent
      );
      return sendSuccess(res, 200, 'Record deleted successfully', result);
    } catch (err) {
      next(err);
    }
  }

  async getTemplate(req, res, next) {
    try {
      const { csv, filename } = await recordsService.generateTemplate(req.ngoId, req.params.recordTypeId);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(csv);
    } catch (err) {
      next(err);
    }
  }

  async bulkImport(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const { csvText, rows, defaultStatus, tags } = req.body;
      const result = await recordsService.bulkImport(
        req.ngoId,
        req.params.recordTypeId,
        { csvText, rows, defaultStatus, tags },
        req.user,
        ip,
        userAgent
      );
      return sendSuccess(res, 201, 'Bulk import completed', result);
    } catch (err) {
      next(err);
    }
  }

  async bulkExport(req, res, next) {
    try {
      const ip = req.ip || req.headers['x-forwarded-for'];
      const userAgent = req.headers['user-agent'];
      const { recordTypeId, status, search, masked, format } = req.query;
      const result = await recordsService.bulkExport(
        req.ngoId,
        { recordTypeId, status, search, masked: masked === 'true' || masked === true },
        req.user,
        ip,
        userAgent
      );

      if (format === 'json') {
        return sendSuccess(res, 200, 'Export data generated', result);
      }

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      return res.status(200).send(result.csv);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RecordsController();
