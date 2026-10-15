const DEFAULT_COBLI_API_KEY = 'Hf0BgNy.6c922154-6578-4387-a030-5b4da54e400c';

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, cobli-api-key, x-cobli-api-key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  const reqHeaders = event.headers || {};
  const queryParams = event.queryStringParameters || {};
  const clientKey =
    reqHeaders['cobli-api-key'] ||
    reqHeaders['x-cobli-api-key'] ||
    queryParams.apiKey ||
    process.env.VITE_COBLI_API_KEY ||
    process.env.COBLI_API_KEY ||
    DEFAULT_COBLI_API_KEY;

  try {
    const response = await fetch('https://api.cobli.co/herbie-1.1/dash/device', {
      method: 'GET',
      headers: {
        'cobli-api-key': String(clientKey).trim(),
        'Accept': 'application/json'
      }
    });

    const text = await response.text();
    return {
      statusCode: response.status,
      headers,
      body: text
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: err && err.message ? err.message : 'Erro interno ao consultar a Cobli via Netlify Function'
      })
    };
  }
};
