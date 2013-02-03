
/**
 * Megaplan server configuration class
 * @class MegaplanServerConf
 * @constuctor
 * @param {String|Object} server Hostname or Object<host[, port, scheme, user, pass]>
 *   @param {String} hostname
 *   @param {Number} [port=443]
 *   @param {String} [scheme=https] http or https
 *   @param {String} [auth] Basic authentication
 *   @param {String} [user] Or user
 * @param {String} [pass] And password
 * @param {Number} [port=443]
 * @param {String} [scheme=https] http or https
 * @param {String} [auth] Basic authentication
 */
var serverconf = function MegaplanServerConf (hostname, port, scheme, auth) {
	if (hostname instanceof MegaplanServerConf) {
		return hostname;
	}

	var o = hostname;
	(o instanceof Object) || (o = {
		hostname: hostname,
		port: port,
		scheme: scheme,
		auth: auth
	});
	if (!o.hostname) {
		throw "No required property `host` provided";
	}

	this.hostname = o.hostname;
	this.port = Number(o.port || 443);
	this.scheme = (this.port === 443 || o.scheme === 'https') ? 'https' : 'http';
	this.auth = o.auth || [ o.user, o.pass ].join(':').replace(/^:/,'') || false;
};
serverconf.prototype = {
	hostname: null,
	port: null,
	scheme: null,
	auth: null
};

module.exports = serverconf;
