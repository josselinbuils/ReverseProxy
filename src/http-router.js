const httpProxy = require('http-proxy');

const { Logger } = require('./logger');
const { getRedirects, getTarget } = require('./routing-helpers');

const FORBIDDEN = 403;
const NOT_FOUND = 404;

module.exports.httpRouter = hosts => {
  const proxy = httpProxy.createProxyServer({});

  proxy.on('error', error => Logger.error(`Proxy error: ${error.message}`));

  return (req, res) => {
    const { headers, hostname, method, protocol, url } = req;
    const redirects = getRedirects(hosts, hostname);

    if (!redirects) {
      return res.status(FORBIDDEN).end('Unknown host');
    }

    if (headers.upgrade === 'websocket') {
      // Status text not handled by browsers
      return res.status(FORBIDDEN);
    }

    if (protocol !== 'https') {
      const newUrl = `https://${hostname}${url}`;
      Logger.info(hostname + ' is a HTTPS only domain, use HTTPS instead of HTTP');
      Logger.info(`Redirect from ${protocol}://${hostname}${url} to ${newUrl}`);
      return res.redirect(newUrl);
    }

    const target = getTarget(redirects, protocol, url);
    const request = `${protocol}://${hostname}${url}`;

    if (target) {
      Logger.info(`${method} ${request} -> ${target}${url}`);
      proxy.web(req, res, { target });
    } else {
      Logger.info(`No HTTP route found: ${method} ${request}`);
      res.status(NOT_FOUND).end();
    }
  };
};
