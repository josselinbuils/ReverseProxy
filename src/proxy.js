const express = require('express');
const helmet = require('helmet');
const http = require('http');
const https = require('spdy');
const leChallengeFs = require('le-challenge-fs');
const leStoreCertbot = require('le-store-certbot')
const LEX = require('greenlock-express');
const redirectHTTPS = require('redirect-https');

const Logger = require('./logger');
const Router = require('./router');

Logger.info('Start ReverseProxy');

let lex = LEX.create({
    server: 'staging',
    challenges: {
        'http-01': leChallengeFs.create({}),
        'tls-sni-01': leChallengeFs.create({})
    },
    store: leStoreCertbot.create({
        configDir: '/letsencrypt/etc',
        privkeyPath: ':configDir/live/:hostname/privkey.pem',
        fullchainPath: ':configDir/live/:hostname/fullchain.pem',
        certPath: ':configDir/live/:hostname/cert.pem',
        chainPath: ':configDir/live/:hostname/chain.pem',
        workDir: '/letsencrypt/var/lib',
        logsDir: '/letsencrypt/var/log',
        webrootPath: '/letsencrypt/srv/www/:hostname/.well-known/acme-challenge'
    }),
    approveDomains: (hostname, cb) => {
        const hostConfig = Router.getHostConfig(hostname);
        const isHTTPS = hostConfig && hostConfig.https;

        Logger.info(`Approve registration for domain ${hostname}: ${isHTTPS}`);

        cb(null, {
            domains: [hostname],
            email: 'josselin.buils@gmail.com',
            agreeTos: isHTTPS
        });
    }
});

let app = express();

Router.init();

app.use(helmet());
app.use(Router.checkHost);
app.get('/url/:url', Router.redirect);
app.use(Router.checkUrl);
app.use(Router.route);

http.createServer(lex.middleware(redirectHTTPS())).listen(80, function () {
    Logger.info(`ReverseProxy is listening on port ${this.address().port} for HTTP protocol`);
});

https.createServer(lex.httpsOptions, lex.middleware(app)).listen(443, function () {
    Logger.info(`ReverseProxy is listening on port ${this.address().port} for HTTPS protocol`);
});