const { z } = require('zod');

const signupSchema = {
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email format"),
    phone: z.string().optional(),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number")
      .regex(/[^A-Za-z0-9]/, "Must contain a special character"),
    termsAccepted: z.boolean().refine(val => val === true, { message: "You must accept terms and privacy policy" })
  })
};

const emailSchema = {
  body: z.object({
    email: z.string().email("Invalid email format")
  })
};

const verifyOtpSchema = {
  body: z.object({
    email: z.string().email("Invalid email format"),
    otp: z.string().length(6, "OTP must be 6 digits")
  })
};

const loginSchema = {
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
    rememberMe: z.boolean().optional().default(false)
  })
};

const sessionIdParamsSchema = {
  params: z.object({
    sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid session ID format')
  })
};

const forgotPasswordSchema = {
  body: z.object({
    email: z.string().email("Invalid email format")
  })
};

const resetPasswordSchema = {
  body: z.object({
    token: z.string().min(1, "Reset token is required"),
    password: z.string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number")
      .regex(/[^A-Za-z0-9]/, "Must contain a special character")
  })
};

module.exports = { 
  signupSchema, 
  emailSchema, 
  verifyOtpSchema, 
  loginSchema,
  sessionIdParamsSchema,
  forgotPasswordSchema,
  resetPasswordSchema
};
