'use strict';

const express = require('express');
const helmet = require('helmet');

const config = require('../config.json');
const HTTPSProxy = require('./httpproxy');
const Logger = require('./logger');
const Router = require('./router');

module.exports = class HTTPProxy {
    static start() {
        Logger.info('Start HTTP proxy');

        let app = express();

        app.use(helmet());

        app.all('*', (req, res) => {

            if (HTTPSProxy.isHTTPSDomain(req.hostname)) {
                Logger.info(`${req.hostname} is a HTTPS domain, use HTTPS instead of HTTP`);
                return res.redirect('https://' + req.headers.host + req.url);
            }

            Router.route(req, res);
        });

        app.listen(80);

        Logger.info('ReverseProxy is listening on port 80 for HTTP protocol');
    }
};