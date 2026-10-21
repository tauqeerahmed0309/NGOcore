const express = require('express');
const { requireAuth } = require('../../middleware/auth');
const notificationsController = require('./notifications.controller');

const router = express.Router();

// List paginated notifications for current authenticated user
router.get('/', requireAuth, notificationsController.getNotifications);

// Quick unread count for bell badge
router.get('/unread-count', requireAuth, notificationsController.getUnreadCount);

// Mark all unread notifications as read
router.patch('/read-all', requireAuth, notificationsController.markAllAsRead);

// Mark a specific notification as read
router.patch('/:id/read', requireAuth, notificationsController.markAsRead);

// Clear all read notifications
router.delete('/read', requireAuth, notificationsController.clearAllRead);

// Delete single notification
router.delete('/:id', requireAuth, notificationsController.deleteNotification);

module.exports = router;
