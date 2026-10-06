export const environment = {
  production: false,
  apiUrl: '/api',
  wsUrl: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api`,
};
