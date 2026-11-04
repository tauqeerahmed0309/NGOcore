const apiRequest = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  if (headers.Authorization?.startsWith('Bearer ')) {
    headers.Cookie = `ngo_access_token=${headers.Authorization.slice(7)}`;
    delete headers.Authorization;
  }

  const res = await fetch(url, { ...options, headers });
  let data = null;
  try {
    data = await res.json();
  } catch {
    // Some negative tests may receive a non-JSON response.
  }

  const setCookie = res.headers.get('set-cookie') || '';
  const accessToken = setCookie.match(/(?:^|,\s*)ngo_access_token=([^;,\s]+)/)?.[1] || null;
  return { status: res.status, ok: res.ok, data, accessToken, setCookie };
};

module.exports = { apiRequest };
