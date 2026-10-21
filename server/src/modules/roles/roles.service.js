const { Role } = require('../ngo/model');
const { User } = require('../users/model');
const { AuditLog } = require('../audit/model');
const { AppError } = require('../../utils/errors');
const { PERMISSIONS_CATALOG } = require('./roles.validation');

class RolesService {
  /**
   * Create a custom role for an NGO
   */
  async createRole(ngoId, data, userId) {
    const existing = await Role.findOne({ ngoId, name: data.name });
    if (existing) {
      throw new AppError(400, `A role named "${data.name}" already exists in your organization`);
    }

    const role = await Role.create({
      ngoId,
      name: data.name,
      description: data.description || '',
      permissions: data.permissions,
      isSystem: false
    });

    await AuditLog.create({
      ngoId,
      userId,
      action: 'ROLE_CREATED',
      resource: 'Role',
      resourceId: role._id,
      details: { roleName: role.name, permissions: role.permissions }
    });

    return role;
  }

  /**
   * List all roles for an NGO with assigned user counts
   */
  async getRoles(ngoId) {
    const roles = await Role.find({ ngoId }).sort({ isSystem: -1, name: 1 }).lean();

    // Compute user counts per role
    const roleCounts = await User.aggregate([
      { $match: { ngoId } },
      { $group: { _id: '$roleId', count: { $sum: 1 } } }
    ]);

    const countMap = {};
    roleCounts.forEach(rc => {
      if (rc._id) countMap[rc._id.toString()] = rc.count;
    });

    return roles.map(r => ({
      ...r,
      userCount: countMap[r._id.toString()] || 0
    }));
  }

  /**
   * Get single role by ID within NGO
   */
  async getRoleById(ngoId, roleId) {
    const role = await Role.findOne({ _id: roleId, ngoId }).lean();
    if (!role) {
      throw new AppError(404, 'Role not found');
    }
    const userCount = await User.countDocuments({ ngoId, roleId: role._id });
    return { ...role, userCount };
  }

  /**
   * Update a custom role
   */
  async updateRole(ngoId, roleId, data, userId) {
    const role = await Role.findOne({ _id: roleId, ngoId });
    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    if (role.isSystem) {
      throw new AppError(400, 'System default roles cannot be modified');
    }

    if (data.name && data.name !== role.name) {
      const existing = await Role.findOne({ ngoId, name: data.name });
      if (existing) {
        throw new AppError(400, `A role named "${data.name}" already exists in your organization`);
      }
      role.name = data.name;
    }

    if (data.description !== undefined) {
      role.description = data.description;
    }

    if (data.permissions) {
      role.permissions = data.permissions;
    }

    await role.save();

    await AuditLog.create({
      ngoId,
      userId,
      action: 'ROLE_UPDATED',
      resource: 'Role',
      resourceId: role._id,
      details: { updatedFields: Object.keys(data) }
    });

    return role;
  }

  /**
   * Delete a custom role
   */
  async deleteRole(ngoId, roleId, userId) {
    const role = await Role.findOne({ _id: roleId, ngoId });
    if (!role) {
      throw new AppError(404, 'Role not found');
    }

    if (role.isSystem) {
      throw new AppError(400, 'System default roles cannot be deleted');
    }

    const assignedUsers = await User.countDocuments({ ngoId, roleId: role._id });
    if (assignedUsers > 0) {
      throw new AppError(
        400,
        `Cannot delete role because ${assignedUsers} user(s) are currently assigned to it. Please reassign them first.`
      );
    }

    await Role.deleteOne({ _id: role._id });

    await AuditLog.create({
      ngoId,
      userId,
      action: 'ROLE_DELETED',
      resource: 'Role',
      resourceId: role._id,
      details: { roleName: role.name }
    });

    return { message: 'Role deleted successfully' };
  }

  /**
   * Get available permissions list
   */
  getPermissionsCatalog() {
    return PERMISSIONS_CATALOG;
  }
}

module.exports = new RolesService();
