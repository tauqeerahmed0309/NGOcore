const { z } = require('zod');

const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .toLowerCase()
    .trim(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty')
});

const changePasswordSchema = z.object({
  currentPassword: z
    .string({ required_error: 'Current password is required' })
    .min(1, 'Current password cannot be empty'),
  newPassword: z
    .string({ required_error: 'New password is required' })
    .min(8, 'New password must be at least 8 characters long')
    .regex(/[a-zA-Z]/, 'New password must contain at least one letter')
    .regex(/[0-9]/, 'New password must contain at least one number')
});

const signupSchema = z.object({
  organizationName: z.string().trim().min(2).max(160),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email().toLowerCase().trim(),
  password: z.string()
    .min(8)
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
}).strict();

const studentLoginSchema = z.object({
  studentId: z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'Student ID must be a valid 24-character system ID'),
  password: z.string().min(1, 'Password cannot be empty')
}).strict();

const googleLoginSchema = z.object({
  credential: z.string().min(1).max(8192),
  role: z.literal('student').optional()
}).strict();
const studentPasswordSetupSchema = z.object({
  token: z.string().regex(/^[0-9a-f]{64}$/, 'Invalid password setup link.'),
  password: z.string().min(8).max(128)
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
}).strict();

const signupEmailSchema = z.object({
  email: z.string().email().toLowerCase().trim()
}).strict();

const passwordResetRequestSchema = z.object({
  email: z.string().email().toLowerCase().trim()
}).strict();

const passwordResetSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  code: z.string().regex(/^\d{6}$/, 'Verification code must contain 6 digits'),
  newPassword: z.string()
    .min(8)
    .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
}).strict();

const verifySignupOtpSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  code: z.string().regex(/^\d{6}$/, 'Verification code must contain 6 digits')
}).strict();

const onboardingSchema = z.object({
  organizationType: z.string().trim().min(2).max(100),
  registrationNumber: z.string().trim().min(1).max(100),
  address: z.string().trim().min(5).max(500)
}).strict();

module.exports = {
  loginSchema,
  studentLoginSchema,
  googleLoginSchema,
  studentPasswordSetupSchema,
  changePasswordSchema,
  signupSchema,
  signupEmailSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  verifySignupOtpSchema,
  onboardingSchema
};
