const Sentry = require("@sentry/node");

exports.initializeSentry = (dsn) => {
    Sentry.init({
        dsn,
        tracesSampleRate: 1.0,
    });
}