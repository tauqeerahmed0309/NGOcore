const mongoose = require('mongoose');
const http = require('http');
const ExcelJS = require('exceljs');
const config = require('../config/env');
const app = require('../app');
const Ngo = require('../models/Ngo');
const User = require('../models/User');
const Student = require('../models/Student');
const Program = require('../models/Program');
const ProgramEnrollment = require('../models/ProgramEnrollment');
const AttendanceSession = require('../models/AttendanceSession');
const AuditLog = require('../models/AuditLog');
const { hashPassword } = require('../utils/passwordHelper');
const { apiRequest } = require('./apiTestClient');
const { sanitizeFormula } = require('../utils/exportGenerators');

let passed = 0;
let failed = 0;

const assert = (condition, message) => {
  if (!condition) {
    failed += 1;
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  passed += 1;
  console.log(`✅ PASSED: ${message}`);
};

const runAll = async () => {
  console.log('================================================================');
  console.log('   RUNNING REPORTS & EXPORTS MVP TEST SUITE                     ');
  console.log('================================================================\n');

  // Connect MongoDB Atlas if not connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.MONGODB_URI);
  }

  // ============================================================================
  // SECTION 1: Formula Injection & Sanitizer Unit Tests
  // ============================================================================
  console.log('▶ [1. Formula Injection & Escaping Unit Tests]');

  assert(sanitizeFormula('=SUM(1,2)') === "'=SUM(1,2)", 'Formula starting with = is prefixed with single quote');
  assert(sanitizeFormula('+12345') === "'+12345", 'Formula starting with + is prefixed with single quote');
  assert(sanitizeFormula('-CMD') === "'-CMD", 'Formula starting with - is prefixed with single quote');
  assert(sanitizeFormula('@dangerous') === "'@dangerous", 'Formula starting with @ is prefixed with single quote');
  assert(sanitizeFormula('\t=cmd') === "'\t=cmd", 'Formula starting with tab is prefixed with single quote');
  assert(sanitizeFormula('Normal Student Name') === 'Normal Student Name', 'Standard text remains completely untouched');
  assert(sanitizeFormula(null) === '', 'Null value safely converted to empty string');
  assert(sanitizeFormula(undefined) === '', 'Undefined value safely converted to empty string');

  // ============================================================================
  // SECTION 2: HTTP Integration Setup with Real Atlas Database
  // ============================================================================
  console.log('\n▶ [2. Database Seeding & Tenant Setup]');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api/v1`;

  const timestamp = Date.now();

  // Create NGO A (Primary testing organization)
  const ngoA = await Ngo.create({
    name: `Reports Test NGO A ${timestamp}`,
    registrationNumber: `REG-NGO-${timestamp}`,
    organizationType: 'Education Non-Profit',
    status: 'approved',
    isActive: true
  });

  // Create NGO B (Cross-tenant testing organization)
  const ngoB = await Ngo.create({
    name: `Reports Test NGO B ${timestamp}`,
    registrationNumber: `REG-NGO-B-${timestamp}`,
    organizationType: 'Health Non-Profit',
    status: 'approved',
    isActive: true
  });

  // Create Staff in NGO A
  const staffUserA = await User.create({
    firstName: 'Reports',
    lastName: 'StaffA',
    email: `staff-rep-a-${timestamp}@example.org`,
    password: await hashPassword('ReportsPass123!'),
    role: 'staff',
    ngoId: ngoA._id,
    isActive: true
  });

  // Create Staff in NGO B
  const staffUserB = await User.create({
    firstName: 'Reports',
    lastName: 'StaffB',
    email: `staff-rep-b-${timestamp}@example.org`,
    password: await hashPassword('ReportsPass123!'),
    role: 'staff',
    ngoId: ngoB._id,
    isActive: true
  });

  // Seed Students in NGO A (including formula-injection student)
  const student1 = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: `STU-REP-01-${timestamp}`,
    firstName: 'Aarav',
    lastName: 'Patel',
    dateOfBirth: new Date('2005-06-15'),
    gender: 'male',
    email: 'aarav.reports@example.org',
    phone: '+91 98765 43210',
    address: '123 MG Road',
    pinCode: '560001',
    state: 'Karnataka',
    schoolName: 'Bangalore Public School',
    educationLevel: 'Grade 12',
    status: 'active'
  });

  const student2 = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: `STU-REP-02-${timestamp}`,
    firstName: 'Priya',
    lastName: 'Sharma',
    dateOfBirth: new Date('2006-08-20'),
    gender: 'female',
    email: 'priya.reports@example.org',
    phone: '+91 98765 43211',
    address: '456 Residency Road',
    pinCode: '560025',
    state: 'Karnataka',
    schoolName: 'National College',
    educationLevel: 'Undergraduate',
    status: 'graduated'
  });

  // Formula injection target student
  const student3 = await Student.create({
    ngoId: ngoA._id,
    registrationNumber: `STU-REP-03-${timestamp}`,
    firstName: '=1+1',
    lastName: 'Target',
    address: '@EXPLOIT',
    status: 'inactive'
  });

  // Seed Student in NGO B
  const studentB = await Student.create({
    ngoId: ngoB._id,
    registrationNumber: `STU-NGO-B-${timestamp}`,
    firstName: 'TenantB',
    lastName: 'Student',
    status: 'active'
  });

  // Seed Programs in NGO A
  const program1 = await Program.create({
    ngoId: ngoA._id,
    code: `PROG-REP-01-${timestamp}`,
    name: 'Digital Literacy 101',
    type: 'class',
    category: 'Skill Development',
    description: 'Basic computing and internet fundamentals.',
    startDate: new Date('2026-01-10'),
    endDate: new Date('2026-06-30'),
    capacity: 30,
    status: 'active',
    coordinator: staffUserA._id,
    assignedStaff: [staffUserA._id]
  });

  const program2 = await Program.create({
    ngoId: ngoA._id,
    code: `PROG-REP-02-${timestamp}`,
    name: 'Youth Leadership Workshop',
    type: 'workshop',
    category: 'Community Leadership',
    startDate: new Date('2026-02-15'),
    capacity: 25,
    status: 'completed'
  });

  // Seed Program in NGO B
  const programB = await Program.create({
    ngoId: ngoB._id,
    code: `PROG-NGO-B-${timestamp}`,
    name: 'NGO B Health Awareness',
    type: 'seminar',
    status: 'active'
  });

  // Seed Enrollments in NGO A
  await ProgramEnrollment.create({
    ngoId: ngoA._id,
    programId: program1._id,
    studentId: student1._id,
    status: 'enrolled',
    enrolledAt: new Date('2026-01-15')
  });

  await ProgramEnrollment.create({
    ngoId: ngoA._id,
    programId: program1._id,
    studentId: student2._id,
    status: 'completed',
    enrolledAt: new Date('2026-01-16')
  });

  // Seed Attendance Session in NGO A
  await AttendanceSession.create({
    ngoId: ngoA._id,
    programId: program1._id,
    sessionDate: new Date('2026-02-01'),
    recordedBy: staffUserA._id,
    entries: [
      { studentId: student1._id, status: 'present', note: 'On time' },
      { studentId: student2._id, status: 'present', note: '' }
    ]
  });

  // Log in Staff A
  const loginResA = await apiRequest(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: staffUserA.email, password: 'ReportsPass123!' })
  });
  const tokenA = loginResA.accessToken;

  // Log in Staff B
  const loginResB = await apiRequest(`${baseUrl}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email: staffUserB.email, password: 'ReportsPass123!' })
  });
  const tokenB = loginResB.accessToken;

  // ============================================================================
  // SECTION 3: Beneficiary Report Tests (JSON, CSV, XLSX, PDF)
  // ============================================================================
  console.log('\n▶ [3. Beneficiary Report Tests]');

  // Test 3.1: JSON Preview
  const benJsonRes = await apiRequest(`${baseUrl}/reports/beneficiaries?format=json`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(benJsonRes.status === 200, 'GET /reports/beneficiaries (JSON) returns 200');
  assert(benJsonRes.data.data.title === 'Beneficiary Master Report', 'Returns correct report title');
  assert(benJsonRes.data.data.data.length >= 3, 'Returns all matching beneficiaries for NGO A');
  assert(benJsonRes.data.data.columns.length >= 10, 'Returns full column definitions');
  const foundStudent1 = benJsonRes.data.data.data.find((s) => s.registrationNumber === student1.registrationNumber);
  assert(foundStudent1 !== undefined, 'Contains created student record');
  assert(foundStudent1.fullName === 'Aarav Patel', 'Maps full name correctly');
  assert(foundStudent1.phone === '+91 98765 43210', 'Includes phone number');
  assert(foundStudent1.pinCode === '560001', 'Includes PIN code');

  // Test 3.2: Status Filter
  const activeBenRes = await apiRequest(`${baseUrl}/reports/beneficiaries?status=active&format=json`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(activeBenRes.status === 200, 'Filtering by status=active returns 200');
  const allActive = activeBenRes.data.data.data.every((s) => s.status === 'ACTIVE');
  assert(allActive, 'All returned records have status=ACTIVE');

  // Test 3.3: CSV Export
  const benCsvRes = await apiRequest(`${baseUrl}/reports/beneficiaries?format=csv`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(benCsvRes.status === 200, 'GET /reports/beneficiaries (CSV) returns 200');
  assert(benCsvRes.headers['content-type'].includes('text/csv'), 'Returns text/csv content-type');
  assert(benCsvRes.headers['content-disposition'].includes('.csv'), 'Returns attachment content-disposition header');
  const csvRaw = typeof benCsvRes.data === 'string' ? benCsvRes.data : benCsvRes.data.toString();
  assert(csvRaw.startsWith('\uFEFF'), 'CSV starts with UTF-8 BOM for Excel compatibility');
  assert(csvRaw.includes('Beneficiary Master Report'), 'CSV includes report title metadata block');
  assert(csvRaw.includes('Aarav Patel'), 'CSV contains beneficiary row');
  // Formula injection check: '=1+1' should be sanitized to '\'=1+1'
  assert(csvRaw.includes("'=1+1"), 'Formula-injected value =1+1 is safely sanitized in CSV output');
  assert(csvRaw.includes("'@EXPLOIT"), 'Formula-injected value @EXPLOIT is safely sanitized in CSV output');

  // Test 3.4: Excel (.xlsx) Export
  const benXlsxRes = await apiRequest(`${baseUrl}/reports/beneficiaries?format=xlsx`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
    responseType: 'arraybuffer'
  });
  assert(benXlsxRes.status === 200, 'GET /reports/beneficiaries (XLSX) returns 200');
  assert(
    benXlsxRes.headers['content-type'].includes('spreadsheetml'),
    'Returns correct Excel MIME content-type'
  );
  const xlsxBuf = Buffer.from(benXlsxRes.data);
  // Zip/XLSX magic bytes check: PK\x03\x04
  assert(xlsxBuf[0] === 0x50 && xlsxBuf[1] === 0x4B, 'XLSX file begins with valid PK zip header');
  const testWorkbook = new ExcelJS.Workbook();
  await testWorkbook.xlsx.load(xlsxBuf);
  const loadedSheet = testWorkbook.worksheets[0];
  assert(loadedSheet !== undefined, 'ExcelJS successfully parses generated XLSX workbook');
  assert(loadedSheet.rowCount >= 8, 'Excel workbook contains header banner, metadata, and data rows');

  // Test 3.5: PDF Export
  const benPdfRes = await apiRequest(`${baseUrl}/reports/beneficiaries?format=pdf`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
    responseType: 'arraybuffer'
  });
  assert(benPdfRes.status === 200, 'GET /reports/beneficiaries (PDF) returns 200');
  assert(benPdfRes.headers['content-type'] === 'application/pdf', 'Returns application/pdf content-type');
  const pdfBuf = Buffer.from(benPdfRes.data);
  // PDF magic bytes check: %PDF-
  const pdfMagic = pdfBuf.slice(0, 5).toString('ascii');
  assert(pdfMagic.startsWith('%PDF-'), 'PDF file begins with valid %PDF- header');
  assert(pdfBuf.length > 1000, 'PDF buffer contains complete rendered document bytes');

  // ============================================================================
  // SECTION 4: Program Activity & Capacity Report Tests
  // ============================================================================
  console.log('\n▶ [4. Program Report Tests]');

  // Test 4.1: JSON Preview with Enrollment Counts
  const progJsonRes = await apiRequest(`${baseUrl}/reports/programs?format=json`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(progJsonRes.status === 200, 'GET /reports/programs (JSON) returns 200');
  assert(progJsonRes.data.data.title === 'Program Activity & Capacity Report', 'Returns correct program report title');
  const foundProg1 = progJsonRes.data.data.data.find((p) => p.code === program1.code);
  assert(foundProg1 !== undefined, 'Contains created program record');
  assert(foundProg1.enrolledCount === 2, 'Accurately computes enrolledCount (2 enrolled students) from ProgramEnrollment collection');
  assert(foundProg1.coordinatorName.includes('Reports StaffA'), 'Populates program coordinator name');
  assert(foundProg1.capacity === 30, 'Includes program capacity');

  // Test 4.2: Program CSV Export
  const progCsvRes = await apiRequest(`${baseUrl}/reports/programs?format=csv`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(progCsvRes.status === 200, 'GET /reports/programs (CSV) returns 200');
  const progCsvRaw = typeof progCsvRes.data === 'string' ? progCsvRes.data : progCsvRes.data.toString();
  assert(progCsvRaw.includes('Digital Literacy 101'), 'Program CSV contains program name');
  assert(progCsvRaw.includes('Skill Development'), 'Program CSV contains category');

  // Test 4.3: Program XLSX Export
  const progXlsxRes = await apiRequest(`${baseUrl}/reports/programs?format=xlsx`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
    responseType: 'arraybuffer'
  });
  assert(progXlsxRes.status === 200, 'GET /reports/programs (XLSX) returns 200');
  const progXlsxBuf = Buffer.from(progXlsxRes.data);
  assert(progXlsxBuf[0] === 0x50 && progXlsxBuf[1] === 0x4B, 'Program XLSX begins with valid PK header');

  // Test 4.4: Program PDF Export
  const progPdfRes = await apiRequest(`${baseUrl}/reports/programs?format=pdf`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
    responseType: 'arraybuffer'
  });
  assert(progPdfRes.status === 200, 'GET /reports/programs (PDF) returns 200');
  const progPdfBuf = Buffer.from(progPdfRes.data);
  assert(progPdfBuf.slice(0, 5).toString('ascii').startsWith('%PDF-'), 'Program PDF begins with valid %PDF- header');

  // ============================================================================
  // SECTION 5: Organization Summary Report Tests
  // ============================================================================
  console.log('\n▶ [5. Organization Operational Summary Report Tests]');

  const orgSummaryRes = await apiRequest(`${baseUrl}/reports/summary?format=json`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(orgSummaryRes.status === 200, 'GET /reports/summary (JSON) returns 200');
  assert(orgSummaryRes.data.data.title === 'Organization Operational Summary', 'Returns Organization Summary title');
  const summaryCards = orgSummaryRes.data.data.summaryCards;
  assert(summaryCards.totalBeneficiaries >= 3, 'Accurately computes totalBeneficiaries');
  assert(summaryCards.activeBeneficiaries >= 1, 'Accurately computes activeBeneficiaries');
  assert(summaryCards.graduatedBeneficiaries >= 1, 'Accurately computes graduatedBeneficiaries');
  assert(summaryCards.totalPrograms >= 2, 'Accurately computes totalPrograms');
  assert(summaryCards.activePrograms >= 1, 'Accurately computes activePrograms');
  assert(summaryCards.totalAttendanceSessions >= 1, 'Accurately computes totalAttendanceSessions');

  // Summary CSV, XLSX, and PDF
  const orgCsvRes = await apiRequest(`${baseUrl}/reports/summary?format=csv`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(orgCsvRes.status === 200, 'GET /reports/summary (CSV) returns 200');
  const orgCsvRaw = typeof orgCsvRes.data === 'string' ? orgCsvRes.data : orgCsvRes.data.toString();
  assert(orgCsvRaw.includes('Total Beneficiaries Registered'), 'CSV includes summary indicator rows');

  const orgXlsxRes = await apiRequest(`${baseUrl}/reports/summary?format=xlsx`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
    responseType: 'arraybuffer'
  });
  assert(orgXlsxRes.status === 200, 'GET /reports/summary (XLSX) returns 200');

  const orgPdfRes = await apiRequest(`${baseUrl}/reports/summary?format=pdf`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` },
    responseType: 'arraybuffer'
  });
  assert(orgPdfRes.status === 200, 'GET /reports/summary (PDF) returns 200');

  // ============================================================================
  // SECTION 6: Security, Multi-Tenant Isolation & RBAC Tests
  // ============================================================================
  console.log('\n▶ [6. Security, Multi-Tenant Isolation & RBAC Tests]');

  // Test 6.1: Cross-tenant isolation
  // Staff B in NGO B must NOT see any students or programs belonging to NGO A
  const crossTenantBenRes = await apiRequest(`${baseUrl}/reports/beneficiaries?format=json`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  assert(crossTenantBenRes.status === 200, 'Cross-tenant beneficiary query returns 200 for NGO B');
  const containsStudentA = crossTenantBenRes.data.data.data.some(
    (s) => s.registrationNumber === student1.registrationNumber
  );
  assert(!containsStudentA, 'NGO B report NEVER contains any beneficiary records from NGO A');

  const crossTenantProgRes = await apiRequest(`${baseUrl}/reports/programs?format=json`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenB}` }
  });
  const containsProgA = crossTenantProgRes.data.data.data.some((p) => p.code === program1.code);
  assert(!containsProgA, 'NGO B report NEVER contains any program records from NGO A');

  // Test 6.2: Unauthenticated access blocked
  const unauthRes = await apiRequest(`${baseUrl}/reports/beneficiaries?format=json`, {
    method: 'GET'
  });
  assert(unauthRes.status === 401, 'Unauthenticated report request returns HTTP 401');

  // Test 6.3: Empty results handling
  const emptyRes = await apiRequest(`${baseUrl}/reports/beneficiaries?status=transferred&format=json`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${tokenA}` }
  });
  assert(emptyRes.status === 200, 'Query with zero results returns 200');
  assert(emptyRes.data.data.data.length === 0, 'Returns empty data array gracefully without crashing');

  // Test 6.4: Audit Log Verification
  // Check that generating/downloading reports produced AuditLog entries
  const auditLogs = await AuditLog.find({
    ngoId: ngoA._id,
    entityType: 'report_export'
  });
  assert(auditLogs.length > 0, 'Report generation and export events are recorded in AuditLog collection');

  // Clean up
  await new Promise((resolve) => server.close(resolve));
  await AttendanceSession.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id] } });
  await ProgramEnrollment.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id] } });
  await Program.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id] } });
  await Student.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id] } });
  await User.deleteMany({ _id: { $in: [staffUserA._id, staffUserB._id] } });
  await Ngo.deleteMany({ _id: { $in: [ngoA._id, ngoB._id] } });
  await AuditLog.deleteMany({ ngoId: { $in: [ngoA._id, ngoB._id] } });

  console.log('\n================================================================');
  console.log(`REPORTS & EXPORTS TEST RESULT: ALL ${passed} TESTS PASSED! ✅`);
  console.log('================================================================');
};

runAll()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
