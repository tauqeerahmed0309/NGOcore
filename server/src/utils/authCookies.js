const config = require('../config/env');

const ACCESS_COOKIE = 'ngo_access_token';
const REFRESH_COOKIE = 'ngo_refresh_token';
const SIGNUP_COOKIE = 'ngo_signup_session';
const REFRESH_PATH = '/api/v1/auth/refresh';
const SIGNUP_PATH = '/api/v1/auth/onboarding';
const accessMaxAge = Number.parseInt(config.JWT_EXPIRES_IN, 10) * 60 * 1000;
const refreshMaxAge = Number.parseInt(config.JWT_REFRESH_EXPIRES_IN, 10) * 24 * 60 * 60 * 1000;

const cookieOptions = (maxAge, path) => ({
  httpOnly: true,
  secure: config.NODE_ENV === 'production',
  sameSite: config.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge,
  path
});

const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(ACCESS_COOKIE, accessToken, cookieOptions(accessMaxAge, '/api/v1'));
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions(refreshMaxAge, REFRESH_PATH));
};

const setSignupCookie = (res, token) => {
  res.cookie(SIGNUP_COOKIE, token, cookieOptions(30 * 60 * 1000, SIGNUP_PATH));
};

const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, cookieOptions(0, '/api/v1'));
  res.clearCookie(REFRESH_COOKIE, cookieOptions(0, REFRESH_PATH));
  res.clearCookie(SIGNUP_COOKIE, cookieOptions(0, SIGNUP_PATH));
};

const readCookie = (req, name) => {
  const cookieHeader = req.headers.cookie || '';
  const cookie = cookieHeader.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return cookie ? cookie.slice(name.length + 1) : null;
};

module.exports = {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  SIGNUP_COOKIE,
  REFRESH_PATH,
  SIGNUP_PATH,
  setAuthCookies,
  setSignupCookie,
  clearAuthCookies,
  readCookie
};
