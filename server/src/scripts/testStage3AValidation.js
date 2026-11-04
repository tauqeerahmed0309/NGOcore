const assert = require('assert');
const path = require('path');
const mongoose = require('mongoose');

const workspaceServer = 'C:/Users/tauqe/OneDrive/Desktop/SIP/Digital Record System For NGO\'s/server';
const Ngo = require(path.join(workspaceServer, 'src/models/Ngo'));
const Student = require(path.join(workspaceServer, 'src/models/Student'));
const User = require(path.join(workspaceServer, 'src/models/User'));
const AuditLog = require(path.join(workspaceServer, 'src/models/AuditLog'));
const studentService = require(path.join(workspaceServer, 'src/services/studentService'));
const { analyzeRecords, applyReview } = require(path.join(workspaceServer, 'src/services/dataAssistantService'));
const { createStudentSchema, updateStudentSchema } = require(path.join(workspaceServer, 'src/validations/studentValidation'));
const { setupTestEnvironment, teardownTestEnvironment } = require(path.join(workspaceServer, 'src/scripts/testHelper'));

async function runStage3ATests() {
  console.log('================================================================');
  console.log('   RUNNING STAGE 3A COMPREHENSIVE VALIDATION SUITE              ');
  console.log('================================================================\n');

  await setupTestEnvironment();

  const testNgo = await Ngo.create({ name: `Stage3A NGO ${Date.now()}`, status: 'approved' });
  const testAdmin = await User.create({
    ngoId: testNgo._id,
    firstName: 'Admin',
    lastName: 'Tester',
    email: `admin.${Date.now()}@example.org`,
    password: 'Password123!',
    role: 'admin',
    status: 'active'
  });
  const ngoFilter = (q = {}) => ({ ...q, ngoId: testNgo._id });

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✅ Test ${String(total).padStart(2, ' ')}: ${name} -> PASSED`);
      passed++;
    } catch (err) {
      console.error(`❌ Test ${String(total).padStart(2, ' ')}: ${name} -> FAILED: ${err.message}`);
    }
  }

  async function testAsync(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✅ Test ${String(total).padStart(2, ' ')}: ${name} -> PASSED`);
      passed++;
    } catch (err) {
      console.error(`❌ Test ${String(total).padStart(2, ' ')}: ${name} -> FAILED: ${err.message}`);
    }
  }

  // 1. Zod Phone Validation
  test('Valid Indian mobile with +91 and spaces normalizes', () => {
    const res = createStudentSchema.parse({
      registrationNumber: 'REG-PH-01',
      firstName: 'Aarav',
      lastName: 'Sharma',
      phone: '+91 98765 43210'
    });
    assert.strictEqual(res.phone, '+91 98765 43210');
  });

  test('Valid 10-digit Indian mobile without prefix normalizes to +91 format', () => {
    const res = createStudentSchema.parse({
      registrationNumber: 'REG-PH-02',
      firstName: 'Pooja',
      lastName: 'Patel',
      phone: '9876543210'
    });
    assert.strictEqual(res.phone, '+91 98765 43210');
  });

  test('Valid Indian mobile with leading zero normalizes', () => {
    const res = createStudentSchema.parse({
      registrationNumber: 'REG-PH-03',
      firstName: 'Rohan',
      lastName: 'Verma',
      phone: '09876543210'
    });
    assert.strictEqual(res.phone, '+91 98765 43210');
  });

  test('Valid Indian mobile with hyphens normalizes', () => {
    const res = createStudentSchema.parse({
      registrationNumber: 'REG-PH-04',
      firstName: 'Sneha',
      lastName: 'Gupta',
      phone: '+91-98765-43210'
    });
    assert.strictEqual(res.phone, '+91 98765 43210');
  });

  test('Rejects invalid phone number with letters', () => {
    assert.throws(() => {
      createStudentSchema.parse({
        registrationNumber: 'REG-PH-05',
        firstName: 'Bad',
        lastName: 'Phone',
        phone: 'abcdefghij'
      });
    }, /Phone number must be a valid 10-digit Indian mobile/);
  });

  test('Rejects invalid short phone number (5 digits)', () => {
    assert.throws(() => {
      createStudentSchema.parse({
        registrationNumber: 'REG-PH-06',
        firstName: 'Bad',
        lastName: 'Phone',
        phone: '12345'
      });
    }, /Phone number must be a valid 10-digit Indian mobile/);
  });

  test('Rejects invalid Indian phone prefix (starts with 1)', () => {
    assert.throws(() => {
      createStudentSchema.parse({
        registrationNumber: 'REG-PH-07',
        firstName: 'Bad',
        lastName: 'Phone',
        phone: '+91 12345 67890'
      });
    }, /Phone number must be a valid 10-digit Indian mobile/);
  });

  // 2. Zod PIN Code Validation
  test('Valid 6-digit Indian PIN code accepted', () => {
    const res = createStudentSchema.parse({
      registrationNumber: 'REG-PIN-01',
      firstName: 'Aarav',
      lastName: 'Sharma',
      pinCode: '560001'
    });
    assert.strictEqual(res.pinCode, '560001');
  });

  test('PIN code with spaces normalized', () => {
    const res = createStudentSchema.parse({
      registrationNumber: 'REG-PIN-02',
      firstName: 'Aarav',
      lastName: 'Sharma',
      pinCode: ' 560 001 '
    });
    assert.strictEqual(res.pinCode, '560001');
  });

  test('Rejects 5-digit PIN code', () => {
    assert.throws(() => {
      createStudentSchema.parse({
        registrationNumber: 'REG-PIN-03',
        firstName: 'Bad',
        lastName: 'Pin',
        pinCode: '56000'
      });
    }, /PIN code must be a valid 6-digit Indian postal code/);
  });

  test('Rejects PIN code starting with 0', () => {
    assert.throws(() => {
      createStudentSchema.parse({
        registrationNumber: 'REG-PIN-04',
        firstName: 'Bad',
        lastName: 'Pin',
        pinCode: '000000'
      });
    }, /PIN code must be a valid 6-digit Indian postal code/);
  });

  test('Rejects PIN code starting with 9 (unassigned civilian)', () => {
    assert.throws(() => {
      createStudentSchema.parse({
        registrationNumber: 'REG-PIN-05',
        firstName: 'Bad',
        lastName: 'Pin',
        pinCode: '999999'
      });
    }, /PIN code must be a valid 6-digit Indian postal code/);
  });

  // 3. Zod DOB & Age Validation
  test('Valid DD/MM/YYYY parsed properly', () => {
    const res = createStudentSchema.parse({
      registrationNumber: 'REG-DOB-01',
      firstName: 'Aarav',
      lastName: 'Sharma',
      dateOfBirth: '15/08/2005'
    });
    assert(res.dateOfBirth instanceof Date);
    assert.strictEqual(res.dateOfBirth.getUTCFullYear(), 2005);
    assert.strictEqual(res.dateOfBirth.getUTCMonth(), 7); // 0-indexed August
    assert.strictEqual(res.dateOfBirth.getUTCDate(), 15);
  });

  test('Rejects future date of birth', () => {
    assert.throws(() => {
      createStudentSchema.parse({
        registrationNumber: 'REG-DOB-02',
        firstName: 'Future',
        lastName: 'Baby',
        dateOfBirth: '2035-12-31'
      });
    }, /Date of birth cannot be in the future/);
  });

  test('Rejects invalid calendar date (Feb 31)', () => {
    assert.throws(() => {
      createStudentSchema.parse({
        registrationNumber: 'REG-DOB-03',
        firstName: 'Bad',
        lastName: 'Date',
        dateOfBirth: '31/02/2012'
      });
    }, /Invalid day in date of birth/);
  });

  test('Rejects implausibly old date (> 120 years)', () => {
    assert.throws(() => {
      createStudentSchema.parse({
        registrationNumber: 'REG-DOB-04',
        firstName: 'Ancient',
        lastName: 'Person',
        dateOfBirth: '1885-05-15'
      });
    }, /implausible age/);
  });

  // 4. Legacy records compatibility
  test('Legacy record without optional fields is accepted', () => {
    const res = createStudentSchema.parse({
      registrationNumber: 'REG-LEGACY-01',
      firstName: 'Old',
      lastName: 'Record'
    });
    assert.strictEqual(res.phone, '');
    assert.strictEqual(res.pinCode, '');
    assert.strictEqual(res.state, '');
  });

  // 5. Database Service Integration (Create & Update)
  await testAsync('studentService creates student with phone, pinCode, state', async () => {
    const created = await studentService.createStudent({
      registrationNumber: 'REG-SVC-01',
      firstName: 'Karan',
      lastName: 'Mishra',
      phone: '+91 98765 43210',
      pinCode: '560001',
      state: 'Karnataka',
      dateOfBirth: '15/08/2005'
    }, testAdmin._id, testNgo._id, ngoFilter);

    assert(created._id);
    assert.strictEqual(created.phone, '+91 98765 43210');
    assert.strictEqual(created.pinCode, '560001');
    assert.strictEqual(created.state, 'Karnataka');
  });

  await testAsync('studentService updates phone, pinCode, state', async () => {
    const created = await studentService.createStudent({
      registrationNumber: 'REG-SVC-02',
      firstName: 'Diya',
      lastName: 'Deshmukh'
    }, testAdmin._id, testNgo._id, ngoFilter);

    const updated = await studentService.updateStudent(created._id, {
      phone: '9811122233',
      pinCode: '400001',
      state: 'Maharashtra'
    }, ngoFilter);

    assert.strictEqual(updated.phone, '+91 98111 22233');
    assert.strictEqual(updated.pinCode, '400001');
    assert.strictEqual(updated.state, 'Maharashtra');
  });

  // 6. Data Cleaning Assistant Integration
  await testAsync('Data Assistant flags invalid phone and suggests fix for non-standard format', async () => {
    // Insert dirty student directly into collection to simulate legacy/imported record
    const s1 = await Student.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      ngoId: testNgo._id,
      registrationNumber: 'DIRTY-01',
      firstName: 'Rohan',
      lastName: 'Joshi',
      phone: '9876543210', // Needs +91 format
      pinCode: ' 560 001 ', // Needs whitespace fix
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const s2 = await Student.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      ngoId: testNgo._id,
      registrationNumber: 'DIRTY-02',
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '12345', // Invalid
      pinCode: '999999', // Invalid
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const analysis = await analyzeRecords('students', ngoFilter);
    const flagsS1 = analysis.flags.filter(f => f.recordId === s1.insertedId.toString());
    const flagsS2 = analysis.flags.filter(f => f.recordId === s2.insertedId.toString());

    // S1 checks
    const phoneS1 = flagsS1.find(f => f.field === 'phone');
    assert(phoneS1, 'Phone format issue should be flagged');
    assert.strictEqual(phoneS1.suggestedValue, '+91 98765 43210');
    assert.strictEqual(phoneS1.severity, 'low');

    const pinS1 = flagsS1.find(f => f.field === 'pinCode');
    assert(pinS1, 'PIN code format issue should be flagged');
    assert.strictEqual(pinS1.suggestedValue, '560001');
    assert.strictEqual(pinS1.severity, 'low');

    // S2 checks
    const phoneS2 = flagsS2.find(f => f.field === 'phone');
    assert(phoneS2, 'Invalid phone should be flagged');
    assert.strictEqual(phoneS2.suggestedValue, null);
    assert.strictEqual(phoneS2.severity, 'high');

    const pinS2 = flagsS2.find(f => f.field === 'pinCode');
    assert(pinS2, 'Invalid PIN should be flagged');
    assert.strictEqual(pinS2.suggestedValue, null);
    assert.strictEqual(pinS2.severity, 'high');
  });

  // 7. Human Review Workflow for New Fields
  await testAsync('Human review accepts phone fix and updates database', async () => {
    const sDoc = await Student.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      ngoId: testNgo._id,
      registrationNumber: 'REVIEW-01',
      firstName: 'Ananya',
      lastName: 'Gupta',
      phone: '9876543210',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const reviewRes = await applyReview({
      recordType: 'students',
      recordId: sDoc.insertedId.toString(),
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'accept',
      ngoFilter
    });

    assert.strictEqual(reviewRes.applied, true);
    assert.strictEqual(reviewRes.record.phone, '+91 98765 43210');

    // Check DB persisted value
    const saved = await Student.findById(sDoc.insertedId);
    assert.strictEqual(saved.phone, '+91 98765 43210');
  });

  await testAsync('Human review provides custom correction for invalid phone', async () => {
    const sDoc = await Student.collection.insertOne({
      _id: new mongoose.Types.ObjectId(),
      ngoId: testNgo._id,
      registrationNumber: 'REVIEW-02',
      firstName: 'Vikram',
      lastName: 'Nair',
      phone: '12345', // Bad value
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const reviewRes = await applyReview({
      recordType: 'students',
      recordId: sDoc.insertedId.toString(),
      issueType: 'inconsistent_format',
      field: 'phone',
      decision: 'accept',
      proposedValue: '9812345678', // Human provided valid number
      ngoFilter
    });

    assert.strictEqual(reviewRes.applied, true);
    assert.strictEqual(reviewRes.record.phone, '+91 98123 45678');
  });

  console.log(`\n================================================================`);
  console.log(`STAGE 3A TEST RESULT: ${passed} / ${total} TESTS PASSED! ✅`);
  console.log(`================================================================`);

  // Clean up
  await Student.deleteMany({ ngoId: testNgo._id });
  await User.deleteMany({ ngoId: testNgo._id });
  await Ngo.deleteOne({ _id: testNgo._id });
  await teardownTestEnvironment();
}

runStage3ATests().catch((err) => {
  console.error('Test runner failure:', err);
  process.exit(1);
});
