const fs = require('fs/promises');
const mongoose = require('mongoose');
const config = require('../config/env');
const AuditLog = require('../models/AuditLog');
const Ngo = require('../models/Ngo');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const AttendanceSession = require('../models/AttendanceSession');
const SignupOtp = require('../models/SignupOtp');
const PasswordResetOtp = require('../models/PasswordResetOtp');
const Session = require('../models/Session');
const Student = require('../models/Student');
const User = require('../models/User');
const app = require('../app');
const emailService = require('../services/emailService');
const { uploadDirectory } = require('../middlewares/onboardingUpload');
const { hashPassword } = require('../utils/passwordHelper');
const { apiRequest } = require('./apiTestClient');

let baseURL;
const email = `signup-test-${Date.now()}@example.org`;
const password = 'SignupFlowTest123!';
const studentEmail = `student-reset-test-${Date.now()}@example.org`;
const studentPassword = 'StudentInitial123!';
const invitedStudentEmail = `student-invite-test-${Date.now()}@example.org`;
const sentCodes = [];
const sentMessages = [];
const testTransport = {
  async sendMail(message) {
    sentMessages.push(message);
    const code = message.text.match(/\b\d{6}\b/)?.[0];
    if (code) sentCodes.push(code);
    return { accepted: [message.to] };
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const cookieValue = (setCookie, name) => (
  setCookie.match(new RegExp(`(?:^|[,;\\s]+)${name}=([^;,\\s]+)`))?.[1] || null
);

const runTests = async () => {
  let ngo;
  let user;
  let studentUser;
  let studentRecord;
  let invitedStudent;
  let invitedStudentRecord;
  let testProgram;
  let uploadedFile;
  const mongoUri = (config.MONGODB_URI && !config.MONGODB_URI.startsWith('mongodb+srv://'))
    ? config.MONGODB_URI
    : 'mongodb://127.0.0.1:27017/ngo_records_db';
  await mongoose.connect(mongoUri);
  emailService.setTransportForTesting(testTransport);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  baseURL = `http://127.0.0.1:${server.address().port}/api/v1`;

  try {
    const signup = await apiRequest(`${baseURL}/auth/signup`, {
      method: 'POST',
      body: JSON.stringify({
        organizationName: `Signup flow test ${Date.now()}`,
        firstName: 'Signup',
        lastName: 'Tester',
        email,
        password
      })
    });
    assert(signup.status === 201, `Signup should return 201, received ${signup.status}.`);
    assert(sentCodes.length === 1, 'Signup should deliver one OTP through the injected mail transport.');
    assert(!JSON.stringify(signup.data).includes(sentCodes[0]), 'Signup must not expose the OTP in its response.');

    user = await User.findOne({ email }).select('+password');
    assert(user?.role === 'ngo_admin' && !user.isEmailVerified, 'Signup should create an unverified organization admin.');
    const unverifiedLogin = await apiRequest(`${baseURL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    assert(
      unverifiedLogin.status === 403 && unverifiedLogin.data?.message?.toLowerCase().includes('verify your email'),
      'Unverified accounts should receive a clear email-verification sign-in message.'
    );
    ngo = await Ngo.findById(user.ngoId);
    const storedOtp = await SignupOtp.findOne({ email }).select('+codeHash');
    assert(storedOtp && storedOtp.codeHash !== sentCodes[0], 'The stored OTP must be hashed.');
    console.log('PASS signup creates a pending NGO and ngo_admin, sends OTP privately, and stores only its hash.');

    const cooldown = await apiRequest(`${baseURL}/auth/signup/resend`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    assert(cooldown.status === 429, 'OTP resend must enforce the 60-second cooldown.');

    storedOtp.expiresAt = new Date(Date.now() - 1000);
    await storedOtp.save();
    const expired = await apiRequest(`${baseURL}/auth/signup/verify`, {
      method: 'POST',
      body: JSON.stringify({ email, code: sentCodes[0] })
    });
    assert(expired.status === 400, 'An expired OTP must be rejected.');

    await SignupOtp.updateOne({ email }, { $set: { expiresAt: new Date(Date.now() + 10 * 60 * 1000) } });
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const invalid = await apiRequest(`${baseURL}/auth/signup/verify`, {
        method: 'POST',
        body: JSON.stringify({ email, code: '000000' === sentCodes[0] ? '000001' : '000000' })
      });
      assert(invalid.status === 400, `Invalid OTP attempt ${attempt + 1} should be rejected.`);
    }
    const capped = await apiRequest(`${baseURL}/auth/signup/verify`, {
      method: 'POST',
      body: JSON.stringify({ email, code: sentCodes[0] })
    });
    assert(capped.status === 400, 'The correct OTP must be rejected after five failed attempts.');

    await SignupOtp.updateOne({ email }, { $set: { lastSentAt: new Date(Date.now() - 61 * 1000) } });
    const resent = await apiRequest(`${baseURL}/auth/signup/resend`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    assert(resent.status === 200 && sentCodes.length === 2, 'A fresh OTP should be available after the cooldown.');
    const verified = await apiRequest(`${baseURL}/auth/signup/verify`, {
      method: 'POST',
      body: JSON.stringify({ email, code: sentCodes[1] })
    });
    const onboardingCookie = verified.setCookie.match(/(?:^|,\s*)(ngo_signup_session=[^;,\s]+)/)?.[1];
    assert(
      verified.status === 200 && onboardingCookie,
      `Valid OTP should verify email and issue an onboarding cookie (HTTP ${verified.status}, ${verified.data?.message || 'no response message'}).`
    );
    console.log('PASS OTP expiry, attempt cap, resend cooldown, and successful email verification.');

    const details = {
      organizationType: 'Community nonprofit',
      registrationNumber: `REG-${Date.now()}`,
      address: '100 Community Road, Example City'
    };
    const noDocument = await apiRequest(`${baseURL}/auth/onboarding`, {
      method: 'POST',
      headers: { Cookie: onboardingCookie },
      body: JSON.stringify(details)
    });
    assert(noDocument.status === 400, 'Onboarding must require a supporting document.');

    const formData = new FormData();
    formData.append('supportingDocument', new Blob(['%PDF-1.4\nsignup test\n%%EOF'], { type: 'application/pdf' }), 'registration.pdf');
    const upload = await fetch(`${baseURL}/auth/onboarding/document`, {
      method: 'POST',
      headers: { Cookie: onboardingCookie },
      body: formData
    });
    assert(upload.status === 201, `Private onboarding document upload should return 201, got ${upload.status}.`);

    ngo = await Ngo.findById(ngo._id);
    uploadedFile = `${uploadDirectory}\\${ngo.supportingDocuments[0].filename}`;
    const publicFileResponse = await fetch(`${baseURL.replace('/api/v1', '')}/uploads/${ngo.supportingDocuments[0].filename}`);
    assert(publicFileResponse.status === 404, 'Private onboarding documents must not be served from public uploads.');

    const complete = await apiRequest(`${baseURL}/auth/onboarding`, {
      method: 'POST',
      headers: { Cookie: onboardingCookie },
      body: JSON.stringify(details)
    });
    assert(complete.status === 202, `Completed onboarding should return 202, got ${complete.status}.`);
    ngo = await Ngo.findById(ngo._id);
    user = await User.findById(user._id);
    assert(ngo.approvalSubmitted && ngo.status === 'pending', 'Onboarding must submit the NGO in pending status.');
    assert(user.isEmailVerified, 'The signup administrator email must be verified.');

    const blockedLogin = await apiRequest(`${baseURL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    assert(
      blockedLogin.status === 403 && blockedLogin.data?.message?.toLowerCase().includes('pending approval'),
      'A pending NGO must not be able to sign in and should receive a status-aware message.'
    );
    ngo.status = 'approved';
    await ngo.save();
    const approvedLogin = await apiRequest(`${baseURL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    assert(approvedLogin.status === 200 && approvedLogin.accessToken, 'An approved NGO admin should be able to sign in.');

    const resetRequest = await apiRequest(`${baseURL}/auth/password/forgot`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    assert(resetRequest.status === 200 && sentCodes.length === 3, 'Eligible NGO admin should receive a password reset code.');
    assert(!JSON.stringify(resetRequest.data).includes(sentCodes[2]), 'Password reset response must not expose the OTP.');
    const resetOtp = await PasswordResetOtp.findOne({ email }).select('+codeHash');
    assert(resetOtp && resetOtp.codeHash !== sentCodes[2], 'Password reset OTP must be stored as a hash.');

    const wrongResetCode = await apiRequest(`${baseURL}/auth/password/reset`, {
      method: 'POST',
      body: JSON.stringify({ email, code: sentCodes[2] === '000000' ? '000001' : '000000', newPassword: 'ResetPassword456!' })
    });
    assert(wrongResetCode.status === 400, 'An incorrect password reset code must be rejected.');

    const reset = await apiRequest(`${baseURL}/auth/password/reset`, {
      method: 'POST',
      body: JSON.stringify({ email, code: sentCodes[2], newPassword: 'ResetPassword456!' })
    });
    assert(reset.status === 200, 'The correct password reset code should update the password.');
    const oldPasswordLogin = await apiRequest(`${baseURL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    const newPasswordLogin = await apiRequest(`${baseURL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password: 'ResetPassword456!' })
    });
    assert(oldPasswordLogin.status === 401, 'The previous password must stop working after reset.');
    assert(newPasswordLogin.status === 200, 'The new password must allow login after reset.');
    assert(!(await PasswordResetOtp.findOne({ email })), 'A used password reset OTP must be deleted.');
    const adminRefreshToken = cookieValue(newPasswordLogin.setCookie, 'ngo_refresh_token');
    assert(adminRefreshToken, 'Login should set the refresh token in an httpOnly cookie.');
    assert(
      /HttpOnly/i.test(newPasswordLogin.setCookie) && /SameSite=(Lax|None)/i.test(newPasswordLogin.setCookie),
      'Authentication cookies should be httpOnly and use an explicit SameSite policy.'
    );
    for (const status of ['rejected', 'suspended']) {
      ngo.status = status;
      await ngo.save();
      const blockedRefresh = await apiRequest(`${baseURL}/auth/refresh`, {
        method: 'POST',
        headers: { Cookie: `ngo_refresh_token=${adminRefreshToken}` }
      });
      assert(
        blockedRefresh.status === 403 && blockedRefresh.data?.message?.toLowerCase().includes(status),
        `${status} organizations should receive a status-aware refresh denial.`
      );
    }
    ngo.status = 'approved';
    await ngo.save();
    const oldSession = await apiRequest(`${baseURL}/auth/me`, {
      headers: { Authorization: `Bearer ${approvedLogin.accessToken}` }
    });
    assert(oldSession.status === 401, 'Password reset must invalidate previously issued sessions.');

    studentUser = await User.create({
      ngoId: ngo._id,
      email: studentEmail,
      password: await hashPassword(studentPassword),
      role: 'student',
      firstName: 'Student',
      lastName: 'Reset Tester',
      isEmailVerified: true
    });
    studentRecord = await Student.create({
      ngoId: ngo._id,
      userId: studentUser._id,
      registrationNumber: `STUDENT-${Date.now()}`,
      firstName: studentUser.firstName,
      lastName: studentUser.lastName,
      email: studentEmail,
      createdBy: user._id
    });
    const studentResetRequest = await apiRequest(`${baseURL}/auth/password/forgot`, {
      method: 'POST',
      body: JSON.stringify({ email: studentEmail })
    });
    assert(studentResetRequest.status === 200 && sentCodes.length === 4, 'Eligible student should receive a password reset code.');
    const studentReset = await apiRequest(`${baseURL}/auth/password/reset`, {
      method: 'POST',
      body: JSON.stringify({ email: studentEmail, code: sentCodes[3], newPassword: 'StudentNewPassword456!' })
    });
    assert(studentReset.status === 200, 'Student should be able to reset a password with an email OTP.');
    const emailStudentLogin = await apiRequest(`${baseURL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email: studentEmail, password: 'StudentNewPassword456!' })
    });
    assert(emailStudentLogin.status === 200, 'Existing email-based student login must remain compatible.');
    const studentLogin = await apiRequest(`${baseURL}/auth/student/login`, {
      method: 'POST',
      body: JSON.stringify({ studentId: studentRecord._id.toString(), password: 'StudentNewPassword456!' })
    });
    assert(studentLogin.status === 200 && studentLogin.accessToken, 'Student should be able to sign in with the record system ID and new password.');
    const invalidStudentLogin = await apiRequest(`${baseURL}/auth/student/login`, {
      method: 'POST',
      body: JSON.stringify({ studentId: studentRecord._id.toString(), password: 'WrongPassword123!' })
    });
    assert(invalidStudentLogin.status === 401, 'Student login must reject an incorrect password.');
    const programCreate = await apiRequest(`${baseURL}/programs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newPasswordLogin.accessToken}` },
      body: JSON.stringify({
        name: 'Signup test learning program',
        code: `SG-${Date.now()}`,
        type: 'class',
        status: 'active',
        capacity: 5
      })
    });
    assert(
      programCreate.status === 201,
      `An approved NGO admin should create a program for its students (HTTP ${programCreate.status}: ${programCreate.data?.message || 'no response message'}).`
    );
    testProgram = programCreate.data.data.program;
    const enrollment = await apiRequest(`${baseURL}/programs/${testProgram._id}/enrollments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newPasswordLogin.accessToken}` },
      body: JSON.stringify({ studentId: studentRecord._id.toString() })
    });
    assert(enrollment.status === 201, 'An active student can be enrolled in an active program.');
    const myEnrollments = await apiRequest(`${baseURL}/programs/my-enrollments`, {
      headers: { Authorization: `Bearer ${studentLogin.accessToken}` }
    });
    assert(
      myEnrollments.status === 200 && myEnrollments.data.data.enrollments[0]?.programId?.code === testProgram.code,
      'Students should be able to view their own enrolled programs.'
    );
    const duplicateEnrollment = await apiRequest(`${baseURL}/programs/${testProgram._id}/enrollments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newPasswordLogin.accessToken}` },
      body: JSON.stringify({ studentId: studentRecord._id.toString() })
    });
    assert(duplicateEnrollment.status === 409, 'Duplicate program enrollments must be rejected.');

    const sessionDate = new Date().toISOString().slice(0, 10);
    const savedAttendance = await apiRequest(`${baseURL}/programs/${testProgram._id}/attendance`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${newPasswordLogin.accessToken}` },
      body: JSON.stringify({
        date: sessionDate,
        entries: [{ studentId: studentRecord._id.toString(), status: 'present', note: 'Attended' }]
      })
    });
    assert(savedAttendance.status === 200, 'Program attendance should be saved for an enrolled student.');
    const attendanceView = await apiRequest(`${baseURL}/programs/${testProgram._id}/attendance?date=${sessionDate}`, {
      headers: { Authorization: `Bearer ${newPasswordLogin.accessToken}` }
    });
    assert(
      attendanceView.status === 200 && attendanceView.data.data.roster[0]?.status === 'present',
      'Attendance retrieval should return the recorded status for the enrolled student.'
    );

    const csvResponse = await fetch(`${baseURL}/reports/participation.csv?from=${sessionDate}&to=${sessionDate}`, {
      headers: { Cookie: `ngo_access_token=${newPasswordLogin.accessToken}` }
    });
    const csv = await csvResponse.text();
    assert(csvResponse.status === 200 && csv.includes('Attendance rate') && csv.includes(studentRecord.registrationNumber),
      'The participation CSV should include student enrollment and attendance data.');
    const reminders = await apiRequest(`${baseURL}/reports/reminders`, {
      headers: { Authorization: `Bearer ${newPasswordLogin.accessToken}` }
    });
    assert(reminders.status === 200 && Array.isArray(reminders.data.data.upcomingPrograms),
      'The dashboard reminders endpoint should return operational follow-ups.');

    const inviteResponse = await apiRequest(`${baseURL}/users`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newPasswordLogin.accessToken}` },
      body: JSON.stringify({
        firstName: 'Invited',
        lastName: 'Learner',
        email: invitedStudentEmail,
        role: 'student'
      })
    });
    assert(inviteResponse.status === 201, 'An administrator should be able to create a student account without choosing a password.');
    assert(!JSON.stringify(inviteResponse.data).includes('passwordSetupTokenHash'),
      'Student setup token hashes must not be exposed in the user creation response.');
    invitedStudent = await User.findOne({ email: invitedStudentEmail }).select('+passwordSetupTokenHash');
    assert(invitedStudent?.isPasswordSetupRequired && invitedStudent.passwordSetupTokenHash,
      'A new student account must remain setup-pending with only a hashed invitation token stored.');
    invitedStudentRecord = await Student.create({
      ngoId: ngo._id,
      userId: invitedStudent._id,
      registrationNumber: `INVITED-${Date.now()}`,
      firstName: 'Invited',
      lastName: 'Learner',
      email: invitedStudentEmail,
      createdBy: user._id
    });
    const inviteMessage = [...sentMessages].reverse().find((message) => message.to === invitedStudentEmail);
    const setupUrl = inviteMessage?.text.match(/https?:\/\/\S+/)?.[0];
    const oldSetupToken = setupUrl ? new URL(setupUrl).searchParams.get('token') : null;
    assert(oldSetupToken, 'The student invitation email should include a one-time password setup link.');
    const resendInvite = await apiRequest(`${baseURL}/users/${invitedStudent._id}/setup-invite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newPasswordLogin.accessToken}` }
    });
    assert(resendInvite.status === 200, 'An administrator should be able to resend a pending student setup invitation.');
    const updatedInviteMessage = [...sentMessages].reverse().find((message) => message.to === invitedStudentEmail);
    const updatedSetupUrl = updatedInviteMessage?.text.match(/https?:\/\/\S+/)?.[0];
    const setupToken = updatedSetupUrl ? new URL(updatedSetupUrl).searchParams.get('token') : null;
    assert(setupToken && setupToken !== oldSetupToken, 'Resending should rotate to a fresh single-use setup token.');
    const oldInvite = await apiRequest(`${baseURL}/auth/password/setup`, {
      method: 'POST',
      body: JSON.stringify({ token: oldSetupToken, password: 'StudentInvitePassword123!' })
    });
    assert(oldInvite.status === 400, 'Resending an invitation should invalidate the previous setup link.');
    const setPassword = await apiRequest(`${baseURL}/auth/password/setup`, {
      method: 'POST',
      body: JSON.stringify({ token: setupToken, password: 'StudentInvitePassword123!' })
    });
    assert(setPassword.status === 200, 'The student should be able to set a password from the invitation link.');
    const invitedStudentLogin = await apiRequest(`${baseURL}/auth/student/login`, {
      method: 'POST',
      body: JSON.stringify({
        studentId: invitedStudentRecord._id.toString(),
        password: 'StudentInvitePassword123!'
      })
    });
    assert(invitedStudentLogin.status === 200, 'The invited student should be able to sign in with the linked record system ID.');
    const reusedInvite = await apiRequest(`${baseURL}/auth/password/setup`, {
      method: 'POST',
      body: JSON.stringify({ token: setupToken, password: 'AnotherPassword123!' })
    });
    assert(reusedInvite.status === 400, 'A password setup invitation must be single-use.');

    const initialRefreshToken = cookieValue(studentLogin.setCookie, 'ngo_refresh_token');
    const rotated = await apiRequest(`${baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `ngo_refresh_token=${initialRefreshToken}` }
    });
    const rotatedRefreshToken = cookieValue(rotated.setCookie, 'ngo_refresh_token');
    assert(
      rotated.status === 200 && rotatedRefreshToken && rotatedRefreshToken !== initialRefreshToken,
      `Refreshing a session should rotate its refresh token (HTTP ${rotated.status}: ${rotated.data?.message || 'no response message'}).`
    );
    const replayedRefresh = await apiRequest(`${baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `ngo_refresh_token=${initialRefreshToken}` }
    });
    const revokedRefresh = await apiRequest(`${baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `ngo_refresh_token=${rotatedRefreshToken}` }
    });
    assert(
      replayedRefresh.status === 401 && revokedRefresh.status === 401,
      'Reusing a rotated refresh token should revoke that device session.'
    );
    const invitedRefreshToken = cookieValue(invitedStudentLogin.setCookie, 'ngo_refresh_token');
    const logoutCurrent = await apiRequest(`${baseURL}/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${invitedStudentLogin.accessToken}` }
    });
    const afterCurrentLogout = await apiRequest(`${baseURL}/auth/me`, {
      headers: { Authorization: `Bearer ${invitedStudentLogin.accessToken}` }
    });
    const refreshAfterCurrentLogout = await apiRequest(`${baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `ngo_refresh_token=${invitedRefreshToken}` }
    });
    assert(
      logoutCurrent.status === 200 && afterCurrentLogout.status === 401 && refreshAfterCurrentLogout.status === 401,
      'Logging out should revoke the current device session, not only clear its browser cookies.'
    );

    const failureLogs = await AuditLog.countDocuments({
      ngoId: ngo._id,
      action: 'signup_verification_failed'
    });
    assert(failureLogs >= 5, 'Failed OTP verification attempts must be audit-logged.');
    assert(await AuditLog.countDocuments({ ngoId: ngo._id, action: 'password_reset' }) === 2, 'Both password resets must be audit-logged.');
    const logoutAll = await apiRequest(`${baseURL}/auth/logout-all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${newPasswordLogin.accessToken}` }
    });
    const afterLogoutAll = await apiRequest(`${baseURL}/auth/me`, {
      headers: { Authorization: `Bearer ${newPasswordLogin.accessToken}` }
    });
    const refreshAfterLogoutAll = await apiRequest(`${baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { Cookie: `ngo_refresh_token=${adminRefreshToken}` }
    });
    assert(
      logoutAll.status === 200 && afterLogoutAll.status === 401 && refreshAfterLogoutAll.status === 401,
      'Logging out from all devices should invalidate current access and refresh sessions.'
    );
    console.log('PASS onboarding requires a private supporting document, submits pending approval, and gates sign-in.');
    console.log('PASS signup verification failures are recorded in the NGO audit trail.');
    console.log('PASS eligible NGO admins can reset their password with a single-use email OTP.');
    console.log('PASS student accounts use single-use email invitations to set their own password.');
    console.log('PASS students can be enrolled in programs, attendance is recorded, and CSV reports include participation.');
    console.log('PASS refresh tokens rotate with replay revocation, and logout invalidates device sessions.');
  } finally {
    if (uploadedFile) await fs.rm(uploadedFile, { force: true });
    if (user) {
      await Session.deleteMany({ userId: user._id });
      await AuditLog.deleteMany({ actorId: user._id });
      await SignupOtp.deleteMany({ userId: user._id });
      await PasswordResetOtp.deleteMany({ email });
      await User.deleteOne({ _id: user._id });
    }
    if (studentUser) {
      await Session.deleteMany({ userId: studentUser._id });
      await AuditLog.deleteMany({ actorId: studentUser._id });
      await PasswordResetOtp.deleteMany({ email: studentEmail });
      if (studentRecord) await Student.deleteOne({ _id: studentRecord._id });
      await User.deleteOne({ _id: studentUser._id });
    }
    if (testProgram) {
      await AttendanceSession.deleteMany({ programId: testProgram._id });
      await ProgramEnrollment.deleteMany({ programId: testProgram._id });
      await Program.deleteOne({ _id: testProgram._id });
    }
    if (invitedStudent) {
      await Session.deleteMany({ userId: invitedStudent._id });
      await AuditLog.deleteMany({ actorId: invitedStudent._id });
      await User.deleteOne({ _id: invitedStudent._id });
    }
    if (invitedStudentRecord) await Student.deleteOne({ _id: invitedStudentRecord._id });
    if (ngo) {
      await AuditLog.deleteMany({ ngoId: ngo._id });
      await Ngo.deleteOne({ _id: ngo._id });
    }
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await mongoose.disconnect();
  }
};

runTests().catch((error) => {
  console.error(`Signup tests failed: ${error.message}`);
  process.exitCode = 1;
});
