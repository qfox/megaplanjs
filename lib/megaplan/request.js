/*jshint laxbreak:true, laxcomma:true, boss:true, strict:false, devel:true, smarttabs:true, onecase:true */

var http = require('http')
  , https = require('https')
  , qs = require('qs')
  , errors = require('./dicts.js').request_errors
  , utils = require('../utils.js');

/**
 * MegaplanRequest class
 * @class MegaplanRequest
 * @constuctor
 * @param {MegaplanServerConf} server
 * @param {String} access_id
 * @param {String} secret_key
 * @param {String} uri Base uri of megaplan API. Базовый URI Megaplan API
 * @param {Object} [data] Some data to send to Megaplan API. Данные, которые будут отправлены в Megaplan API
 * @param {String|Function} [res_data_filter] Some key to return from response instead of all data or callback to filter response data. Некоторый ключ для возвращения ответа вместо всех данных или callback для фильтрации данных 
 * @param {Function} [req_data_filter] Callback to filter request data. keysToPascalCase by default. Callback дя фильтрации ответа. По умолчанию keysToPascalCase
 */
var Request = function MegaplanRequest (server, access_id, secret_key, uri, data, res_data_filter, req_data_filter) {
	this.server     = server;

	this.uri        = uri;
	this.url        = [ this.server.hostname, uri ].join('/');

	this.access_id  = access_id;
	this.secret_key = secret_key;

	this.now        = (new Date()).toUTCString();
	this.data       = data || {};

	this.req_data_filter = req_data_filter !== false ? req_data_filter : function (v) { return v; };
	this.res_data_filter = res_data_filter !== false ? res_data_filter : function (v) { return v; };
};
Request.prototype = {
	server:       null,
	// common
	method:       'POST',
	content_type: 'application/x-www-form-urlencoded',
	user_agent:   'MegaplanJS Client',
	// user data
	uri:          null,
	access_id:    null,
	secret_key:   null,
	signature:    null,
	auth_key:     null,
	// something speccy
	now:          null,
	data:         null,
	req_data_filter: null,
	res_data_filter: null,
	// default callbacks
	success_callback: null,
	fail_callback: null,

	callbacks: function (success, fail) {
		this.success_callback = success;
		this.fail_callback = fail;
	},

	sign: function () {
		var text = [ this.method, '', this.content_type, this.now, this.url ].join("\n");
		this.signature = utils.make_signature(this.secret_key, text);
		this.auth_key = [ this.access_id, this.signature ].join(':');
		return this;
	},

	/**
	 * Proceed prepared request and calls success_callback (or fail_callback) with result
	 *
	 * Производит подготовку и отправку запроса и вызывает success_callback (или fail_callback) с результатом
	 * 
	 * @memberof MegaplanRequest
	 * @param {Function} [success] Callback for fine results. Callback для успешного запроса
	 * @param {Function} [fail] Callback for errors. Callback для ошибок
	 */
	send: function (success, fail) {
		var req, options, req_data_filter;

		success = success || this.success_callback;
		fail = fail || this.fail_callback;

		req_data_filter = this.req_data_filter || function (h) {
			return utils.convertKeysToPascalCase(h);
		};
		data = this.data && qs.stringify(req_data_filter(this.data));
		// todo: qs.stringify can't create boundaries and attach files to post body.
		// need to more powerfull thing to do it

		// todo: move port and protocol configuration out of here
		options = {
			method: this.method,
			hostname: this.server.hostname,
			port: this.server.port,
			path: '/' + this.uri,
			headers: {
				'Date': this.now, // really?
				'Accept': 'application/json',
				'User-Agent': this.user_agent,
				'Content-Length': data.length,
				'Content-Type': this.content_type
			}
		};
		if (this.server.auth) {
			options.auth = this.server.auth;
		}
		if (this.auth_key) {
			options.headers['X-Authorization'] = this.auth_key;
		}

		var jkey = this.res_data_filter;
		success = success || function () {};
		fail = fail || function () {};

		// console.log(options, data);//process.exit();

		var transport = this.server.scheme === 'http' ? http : https;

		req = transport.request(options, function (res) {
			// console.log('STATUS: ' + res.statusCode);
			// console.log('HEADERS: ' + JSON.stringify(res.headers));
			var chunks = [];
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				// console.log('BODY: ' + chunk);
				chunks.push(chunk);
			});
			res.on('end', function () {
				var json, result;
				try {
					json = JSON.parse(chunks.join(''));
					chunks = null;
					if ((json.status && json.status.code) !== 'ok') {
						return fail ({'error': json.status});
					}

					// move it to client mb?
					result = json.data || json.json || {};
					result = utils.convertKeysToUnderscore(result);
					result = utils.convertValuesToNatives(result);
					if (jkey && (typeof jkey === 'string') && !result[jkey]) {
						throw "key " + jkey + " not exists in json";
					}
					if (jkey && (typeof jkey === 'function')) {
						result = jkey(result);
					} else if (jkey) {
						result = result[jkey];
					}

					return success (result);

				} catch (e) {
					// json broken?
					fail ({
						'error': {'code': ':invalidjson', 'message': errors[':invalidjson']},
						'exception': e
					});
				}
			});
			res.on('close', function () {
				if (!chunks) {
					// all is ok. im right?
					return;
				}
				fail({
					'error': {'code': ':hangup', 'message': errors[':hangup']},
					'chunks': chunks
				});
			});
		});

		req.on('error', function (e) {
			// console.log('problem with request: ' + e.message);
			fail({
				'error': {'code': ':network', 'message': errors[':network']},
				'exception': e
			});
		});

		// write data to request body
		req.write(data);

		req.end();

		return this;
	}
};

module.exports = Request;
