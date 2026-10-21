const { Notification } = require('./model');
const { AppError } = require('../../utils/errors');

/**
 * Create a new notification for a user
 */
const createNotification = async ({
  ngoId,
  userId,
  title,
  message,
  type = 'info',
  link = null,
  metadata = {}
}) => {
  if (!userId) {
    throw new AppError(400, 'userId is required to create a notification');
  }

  const notification = await Notification.create({
    ngoId,
    userId,
    title,
    message,
    type,
    link,
    metadata
  });

  return notification;
};

/**
 * Bulk create notification for multiple users
 */
const notifyUsers = async ({
  userIds = [],
  ngoId,
  title,
  message,
  type = 'info',
  link = null,
  metadata = {}
}) => {
  if (!userIds || userIds.length === 0) return [];

  const docs = userIds.map(userId => ({
    ngoId,
    userId,
    title,
    message,
    type,
    link,
    metadata
  }));

  return await Notification.insertMany(docs);
};

/**
 * Get paginated notifications for an authenticated user
 */
const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false } = {}) => {
  const query = { userId };
  if (unreadOnly === true || unreadOnly === 'true') {
    query.isRead = false;
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const skip = (pageNum - 1) * limitNum;

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, isRead: false })
  ]);

  return {
    notifications,
    unreadCount,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(total / limitNum)
    }
  };
};

/**
 * Get quick unread count for bell badge
 */
const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ userId, isRead: false });
};

/**
 * Mark a single notification as read
 */
const markAsRead = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) {
    throw new AppError(404, 'Notification not found');
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

/**
 * Mark all notifications as read for a user
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } }
  );

  return {
    message: 'All notifications marked as read',
    modifiedCount: result.modifiedCount
  };
};

/**
 * Delete a specific notification
 */
const deleteNotification = async (notificationId, userId) => {
  const notification = await Notification.findOne({ _id: notificationId, userId });
  if (!notification) {
    throw new AppError(404, 'Notification not found');
  }

  await Notification.deleteOne({ _id: notification._id });
  return { message: 'Notification removed successfully' };
};

/**
 * Clear all read notifications for a user
 */
const clearAllRead = async (userId) => {
  const result = await Notification.deleteMany({ userId, isRead: true });
  return {
    message: 'Read notifications cleared successfully',
    deletedCount: result.deletedCount
  };
};

module.exports = {
  createNotification,
  notifyUsers,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllRead
};
