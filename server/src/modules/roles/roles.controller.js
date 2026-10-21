const rolesService = require('./roles.service');
const { sendSuccess } = require('../../utils/response');

class RolesController {
  async createRole(req, res, next) {
    try {
      const role = await rolesService.createRole(req.scopedNgoId, req.body, req.user._id);
      sendSuccess(res, 201, 'Role created successfully', role);
    } catch (err) {
      next(err);
    }
  }

  async getRoles(req, res, next) {
    try {
      const roles = await rolesService.getRoles(req.scopedNgoId);
      sendSuccess(res, 200, 'Roles retrieved successfully', roles);
    } catch (err) {
      next(err);
    }
  }

  async getRoleById(req, res, next) {
    try {
      const role = await rolesService.getRoleById(req.scopedNgoId, req.params.roleId);
      sendSuccess(res, 200, 'Role details retrieved', role);
    } catch (err) {
      next(err);
    }
  }

  async updateRole(req, res, next) {
    try {
      const role = await rolesService.updateRole(req.scopedNgoId, req.params.roleId, req.body, req.user._id);
      sendSuccess(res, 200, 'Role updated successfully', role);
    } catch (err) {
      next(err);
    }
  }

  async deleteRole(req, res, next) {
    try {
      const result = await rolesService.deleteRole(req.scopedNgoId, req.params.roleId, req.user._id);
      sendSuccess(res, 200, result.message);
    } catch (err) {
      next(err);
    }
  }

  async getPermissionsCatalog(req, res, next) {
    try {
      const catalog = rolesService.getPermissionsCatalog();
      sendSuccess(res, 200, 'Permissions catalog retrieved', catalog);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RolesController();
