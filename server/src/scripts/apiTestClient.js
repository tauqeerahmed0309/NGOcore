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
  const contentType = res.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  } else if (contentType.includes('text/')) {
    const arrayBuffer = await res.arrayBuffer();
    data = Buffer.from(arrayBuffer).toString('utf8');
  } else {
    const arrayBuffer = await res.arrayBuffer();
    data = Buffer.from(arrayBuffer);
  }

  const setCookie = res.headers.get('set-cookie') || '';
  const accessToken = setCookie.match(/(?:^|,\s*)ngo_access_token=([^;,\s]+)/)?.[1] || null;
  return {
    status: res.status,
    ok: res.ok,
    data,
    accessToken,
    setCookie,
    headers: Object.fromEntries(res.headers.entries())
  };
};

module.exports = { apiRequest };
