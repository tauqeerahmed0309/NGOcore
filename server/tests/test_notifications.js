const mongoose = require('mongoose');
const env = require('../src/config/env');
const { NGO, Role } = require('../src/modules/ngo/model');
const { User } = require('../src/modules/users/model');
const { Session } = require('../src/modules/auth/model');
const { Notification } = require('../src/modules/notifications/model');
const notificationsService = require('../src/modules/notifications/notifications.service');
const userService = require('../src/modules/users/user.service');

async function runNotificationsTests() {
  console.log('=== STARTING NOTIFICATIONS SYSTEM TESTS (MODULE 20) ===\n');

  await mongoose.connect(env.MONGODB_URI);

  const testNgoId = new mongoose.Types.ObjectId();
  const testUserAId = new mongoose.Types.ObjectId();
  const testUserBId = new mongoose.Types.ObjectId();

  // Cleanup test state
  await NGO.deleteMany({ _id: testNgoId });
  await User.deleteMany({ _id: { $in: [testUserAId, testUserBId] } });
  await Notification.deleteMany({ userId: { $in: [testUserAId, testUserBId] } });
  await Session.deleteMany({ userId: { $in: [testUserAId, testUserBId] } });

  try {
    // 1. Setup Test NGO and Users
    console.log('[SETUP] Setting up test NGO and user accounts...');
    await NGO.create({
      _id: testNgoId,
      name: 'Asha Rural Foundation',
      contactEmail: 'contact@asharural-test.org',
      status: 'approved'
    });

    const userA = await User.create({
      _id: testUserAId,
      ngoId: testNgoId,
      name: 'Ananya Roy',
      email: 'ananya@asharural-test.org',
      password: 'HashedPassword123!',
      status: 'active'
    });

    const userB = await User.create({
      _id: testUserBId,
      ngoId: testNgoId,
      name: 'Devendra Mehra',
      email: 'devendra@asharural-test.org',
      password: 'HashedPassword123!',
      status: 'active'
    });

    console.log('✓ Test environment initialized.\n');

    // ----------------------------------------------------
    // TEST 1: Create Single & Bulk Notifications
    // ----------------------------------------------------
    console.log('[TEST 1] Creating notifications (approval, invitation, security, system)...');
    const notif1 = await notificationsService.createNotification({
      ngoId: testNgoId,
      userId: testUserAId,
      title: 'Organization Approved & Verified!',
      message: 'Your organization vault is now fully active.',
      type: 'approval',
      link: '/dashboard'
    });
    if (!notif1._id) throw new Error('Notification creation failed');
    if (notif1.isRead !== false) throw new Error('Default isRead should be false');

    const notif2 = await notificationsService.createNotification({
      ngoId: testNgoId,
      userId: testUserAId,
      title: 'New Team Member Invited',
      message: 'An invitation was sent to social.worker@asharural-test.org',
      type: 'invitation',
      link: '/users'
    });

    const notif3 = await notificationsService.createNotification({
      ngoId: testNgoId,
      userId: testUserAId,
      title: 'Security Alert: New Sign-in',
      message: 'New sign-in detected from Chrome on Windows 11.',
      type: 'security',
      link: '/profile'
    });

    // Bulk creation for User B
    await notificationsService.notifyUsers({
      userIds: [testUserBId],
      ngoId: testNgoId,
      title: 'Welcome to Asha Rural Foundation',
      message: 'Your staff account is ready for operation.',
      type: 'info',
      link: '/profile'
    });

    console.log('✓ Test 1 Passed: Single and bulk in-app notifications created.\n');

    // ----------------------------------------------------
    // TEST 2: Retrieve User Notifications & Unread Count
    // ----------------------------------------------------
    console.log('[TEST 2] Retrieving user notifications with unread counts...');
    const listA = await notificationsService.getUserNotifications(testUserAId, { page: 1, limit: 10 });
    if (listA.notifications.length !== 3) {
      throw new Error(`Expected 3 notifications for User A, got ${listA.notifications.length}`);
    }
    if (listA.unreadCount !== 3) {
      throw new Error(`Expected unreadCount=3, got ${listA.unreadCount}`);
    }

    const unreadCountA = await notificationsService.getUnreadCount(testUserAId);
    if (unreadCountA !== 3) {
      throw new Error(`Expected getUnreadCount=3, got ${unreadCountA}`);
    }
    console.log(`✓ Test 2 Passed: ${listA.notifications.length} notifications fetched with unreadCount=${listA.unreadCount}.\n`);

    // ----------------------------------------------------
    // TEST 3: Mark Single Notification as Read
    // ----------------------------------------------------
    console.log('[TEST 3] Marking single notification as read...');
    const readNotif = await notificationsService.markAsRead(notif1._id, testUserAId);
    if (!readNotif.isRead || !readNotif.readAt) {
      throw new Error('Notification isRead was not set to true with readAt');
    }

    const countAfterOneRead = await notificationsService.getUnreadCount(testUserAId);
    if (countAfterOneRead !== 2) {
      throw new Error(`Expected unreadCount=2 after marking 1 as read, got ${countAfterOneRead}`);
    }
    console.log(`✓ Test 3 Passed: Notification marked read, unreadCount decremented to ${countAfterOneRead}.\n`);

    // ----------------------------------------------------
    // TEST 4: Mark All Notifications as Read
    // ----------------------------------------------------
    console.log('[TEST 4] Marking all remaining notifications as read...');
    const markAllRes = await notificationsService.markAllAsRead(testUserAId);
    if (markAllRes.modifiedCount !== 2) {
      throw new Error(`Expected 2 notifications marked read, got ${markAllRes.modifiedCount}`);
    }

    const countAfterAllRead = await notificationsService.getUnreadCount(testUserAId);
    if (countAfterAllRead !== 0) {
      throw new Error(`Expected unreadCount=0, got ${countAfterAllRead}`);
    }
    console.log('✓ Test 4 Passed: All notifications marked as read; unread count is 0.\n');

    // ----------------------------------------------------
    // TEST 5: Strict User Isolation
    // ----------------------------------------------------
    console.log('[TEST 5] Verifying cross-user notification isolation...');
    const listB = await notificationsService.getUserNotifications(testUserBId);
    if (listB.notifications.length !== 1) {
      throw new Error(`User B should only see 1 notification, got ${listB.notifications.length}`);
    }

    // User A cannot mark User B's notification as read
    const userBNotifId = listB.notifications[0]._id;
    let crossReadBlocked = false;
    try {
      await notificationsService.markAsRead(userBNotifId, testUserAId);
    } catch (err) {
      crossReadBlocked = true;
      if (err.statusCode !== 404) {
        throw new Error(`Expected 404 for cross-user notification access, got ${err.statusCode}`);
      }
    }
    if (!crossReadBlocked) {
      throw new Error('Security flaw: User A was able to access User B\'s notification!');
    }
    console.log('✓ Test 5 Passed: Zero cross-user notification access permitted.\n');

    // ----------------------------------------------------
    // TEST 6: Delete & Clear Read Notifications
    // ----------------------------------------------------
    console.log('[TEST 6] Deleting individual notification and clearing read items...');
    await notificationsService.deleteNotification(notif1._id, testUserAId);
    const afterDelete = await notificationsService.getUserNotifications(testUserAId);
    if (afterDelete.notifications.length !== 2) {
      throw new Error(`Expected 2 remaining notifications, got ${afterDelete.notifications.length}`);
    }

    const clearRes = await notificationsService.clearAllRead(testUserAId);
    if (clearRes.deletedCount !== 2) {
      throw new Error(`Expected 2 read notifications cleared, got ${clearRes.deletedCount}`);
    }

    const afterClear = await notificationsService.getUserNotifications(testUserAId);
    if (afterClear.notifications.length !== 0) {
      throw new Error(`Expected 0 notifications left, got ${afterClear.notifications.length}`);
    }
    console.log('✓ Test 6 Passed: Notification deletion and bulk read-clearing verified.\n');

    // ----------------------------------------------------
    // TEST 7: Automated Notification Triggers (Security & Sessions)
    // ----------------------------------------------------
    console.log('[TEST 7] Testing automated notification generation on session revocation...');
    const sampleSession = await Session.create({
      userId: testUserAId,
      refreshToken: 'sample_notif_refresh_token_123',
      deviceInfo: 'Firefox on Android Tablet',
      ip: '103.24.50.12',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await userService.revokeSession(testUserAId, sampleSession._id, '127.0.0.1', 'Test Suite');

    const freshNotifs = await notificationsService.getUserNotifications(testUserAId);
    if (freshNotifs.notifications.length === 0) {
      throw new Error('Automated security notification was not created upon session revocation!');
    }
    const sessionNotif = freshNotifs.notifications[0];
    if (sessionNotif.type !== 'security') {
      throw new Error(`Expected notification type 'security', got '${sessionNotif.type}'`);
    }
    console.log(`✓ Test 7 Passed: Automated security notification "${sessionNotif.title}" received.\n`);

    console.log('🎉 ALL 7 NOTIFICATIONS SYSTEM TESTS COMPLETED SUCCESSFULLY!');
  } finally {
    // Cleanup
    await NGO.deleteMany({ _id: testNgoId });
    await User.deleteMany({ _id: { $in: [testUserAId, testUserBId] } });
    await Notification.deleteMany({ userId: { $in: [testUserAId, testUserBId] } });
    await Session.deleteMany({ userId: { $in: [testUserAId, testUserBId] } });
    await mongoose.disconnect();
  }
}

runNotificationsTests().catch(err => {
  console.error('❌ Notifications Test Suite Failed:', err);
  process.exit(1);
});
