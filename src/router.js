const httpProxy = require('http-proxy');

const config = require('../config.json');
const Logger = require('./logger');

const FORBIDDEN = 403;
const NOT_FOUND = 404;

module.exports = class Router {

    static checkHost(req, res, next) {
        const hostConfig = Router.getHostConfig(req.hostname);

        if (!hostConfig) {
            return res.status(FORBIDDEN).end('Unknown host');
        }

        next();
    }

    static getHostConfig(hostname) {
        return config.hosts[/^www\./.test(hostname) ? hostname.slice(4) : hostname];
    }

    static init() {
        Logger.info(`Initializes router`);
        Router.proxy = httpProxy.createProxyServer({});
        Router.proxy.on('error', error => Logger.error('Proxy error: ' + error.message));
    }

    static isHTTPS(hostname) {
        const hostConfig = Router.getHostConfig(hostname);
        return hostConfig && hostConfig.https;
    }

    static redirectHTTPS(req, res, next) {
        const hostConfig = Router.getHostConfig(req.hostname);

        if (req.protocol !== 'https' && hostConfig.https && hostConfig.forceHttps) {
            Logger.info(req.hostname + ' is a HTTPS only domain, use HTTPS instead of HTTP');

            const newUrl = 'https://' + req.hostname + req.url;

            Logger.info(`Redirect from ${req.protocol}://${req.hostname + req.url} to ${newUrl}`);
            return res.redirect(newUrl);
        }
        next();
    }

    static route(req, res) {
        const hostConfig = Router.getHostConfig(req.hostname);
        const request = req.protocol + '://' + req.hostname + req.path;

        let redirect;

        if (Array.isArray(hostConfig.redirects)) {
            redirect = hostConfig.redirects.find(redirect => req.path.indexOf(redirect.path) === 0);

            if (redirect) {
                const target = `http://${redirect.service}:${redirect.port}`;
                Logger.info(`${req.method} ${request} -> ${target + req.path}`);
                Router.proxy.web(req, res, {target: target});
            } else {
                Logger.info(`No route found: ${req.method} ${request}`);
                res.status(NOT_FOUND).end();
            }
        } else {
            Logger.error('Invalid configuration: host property "redirects" should be an array');
            res.status(NOT_FOUND).end();
        }
    }
};