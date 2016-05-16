'use strict';

const LEX = require('letsencrypt-express');

const HTTPProxy = require('./src/httpproxy');
const HTTPSProxy = require('./src/httpsproxy');
const Logger = require('./src/logger');
const Router = require('./src/router');

Logger.info('Start ReverseProxy');

let lex = LEX.create({
    configDir: '/letsencrypt',
    approveRegistration: function (hostname, cb) {
        if (HTTPSProxy.isHTTPSDomain(hostname)) {
            Logger.info('Approve registration for domain ' + hostname);

            cb(null, {
                domains: [hostname],
                email: 'josselin.buils@gmail.com',
                agreeTos: true
            });

        } else {
            Logger.info(hostname + ' is not a HTTPS domain');
        }
    },
    lifetime: 10000,
    memorizeFor: 10000
});

Router.init();
HTTPProxy.start(lex);
HTTPSProxy.start(lex);