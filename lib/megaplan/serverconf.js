
/**
 * Megaplan server configuration class.
 *
 * Конфигурация сервера Megaplan
 * 
 * @class MegaplanServerConf
 * @constuctor
 * @param {String|Object} server Hostname or Object<host[, port, scheme, user, pass]>
 * @param {String} server.hostname
 * @param {Number} [server.port=443]
 * @param {String} [server.scheme=https] http or https
 * @param {String} [server.auth] Basic authentication
 * @param {String} [server.user] Or user
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

	this.hostname = o.hostname || o.host;
	if (!this.hostname) {
		throw "No required property `hostname` provided";
	}

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
serverconf.isSelfLikeObject = function (o) {
	return (o.host || o.hostname) || (o instanceof serverconf);
};

module.exports = serverconf;
