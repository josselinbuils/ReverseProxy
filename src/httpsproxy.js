'use strict';

const express = require('express');
const helmet = require('helmet');
const https = require('spdy');
const LEX = require('letsencrypt-express');

const config = require('../config.json');
const Logger = require('./logger');
const Router = require('./router');

module.exports = class HTTPSProxy {

    static isHTTPSDomain(hostname) {
        return config.httpsHosts.indexOf(hostname) !== -1;
    }

    static start() {
        Logger.info('Start HTTPS proxy');

        let lex = LEX.create({
            configDir: '/letsencrypt',
            approveRegistration: function (hostname, cb) {
                if (HTTPSProxy.isHTTPSDomain(hostname)) {
                    Logger.info('Approve registration for domain' + hostname);

                    cb(null, {
                        domains: config.httpsHosts,
                        email: 'josselin.buils@gmail.com',
                        agreeTos: true
                    });

                } else {
                    Logger.info(hostname + ' is not a HTTPS domain');
                }
            }
        });

        let app = express();

        app.use(helmet());

        app.use((req, res, next) => {

            if (!/^www\./.test(req.hostname) && req.hostname.split('.').length === 2) {
                let acmePrefixIndex = req.url.indexOf('.well-known'),
                    url = acmePrefixIndex !== -1 ? req.url.slice(0, acmePrefixIndex) : req.url;

                Logger.info('Redirect to https://www.' + req.hostname + url);
                return res.redirect('https://www.' + req.hostname + url);
            }

            next();
        });

        app.use(LEX.createAcmeResponder(lex, Router.route));

        https.createServer(lex.httpsOptions, app).listen(443);

        Logger.info('ReverseProxy is listening on port 443 for HTTPS protocol');
    }
};