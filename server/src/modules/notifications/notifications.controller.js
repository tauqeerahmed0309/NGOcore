const notificationsService = require('./notifications.service');
const { sendSuccess } = require('../../utils/response');

const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const result = await notificationsService.getUserNotifications(userId, req.query);
    sendSuccess(res, 200, 'Notifications retrieved successfully', result.notifications, null, {
      pagination: result.pagination,
      unreadCount: result.unreadCount
    });
  } catch (error) {
    next(error);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const count = await notificationsService.getUnreadCount(userId);
    sendSuccess(res, 200, 'Unread notifications count retrieved', { unreadCount: count });
  } catch (error) {
    next(error);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const notification = await notificationsService.markAsRead(req.params.id, userId);
    sendSuccess(res, 200, 'Notification marked as read', notification);
  } catch (error) {
    next(error);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const result = await notificationsService.markAllAsRead(userId);
    sendSuccess(res, 200, result.message, { modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const result = await notificationsService.deleteNotification(req.params.id, userId);
    sendSuccess(res, 200, result.message);
  } catch (error) {
    next(error);
  }
};

const clearAllRead = async (req, res, next) => {
  try {
    const userId = req.user.userId || req.user._id;
    const result = await notificationsService.clearAllRead(userId);
    sendSuccess(res, 200, result.message, { deletedCount: result.deletedCount });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllRead
};
