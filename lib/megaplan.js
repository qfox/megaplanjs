/*jshint laxbreak:true, laxcomma:true, boss:true, strict:false, devel:true, smarttabs:true, onecase:true */

var crypto = require('crypto')
  , https = require('https')
  , querystring = require('querystring')
  , inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter;


// helpers
var b64encode = function (data) {
	return (new Buffer(data)).toString('base64');
};
var keyToPascalCase = function (s) {
	return String(s).substr(0, 1).toUpperCase() + String(s).substr(1).replace(/_[a-z]/ig, function ($0) { return $0.substr(1,1).toUpperCase(); });
};
var keyToUnderscore = function (s) {
	return String(s).replace(/[A-Z]/g, function ($0) { return "_" + $0.toLowerCase(); }).replace(/^_/,'');
};
var keysConvert = function (h, conv) {
	var r = {};
	if (typeof h !== 'object') {
		return h;
	}
	for (var k in h) {
		r[conv(k)] = keysConvert(h[k], conv);
	}
	return r;
};


var errors = {
	':hangup': 'connection closed unexpectedly',
	':invalidjson': 'received invalid json string',
	':network': 'request dropped'
};

/**
 * MegaplanRequest class
 *
 */
var Request = function MegaplanRequest (hostname, access_id, secret_key, uri, data, jsonKey) {
	this.hostname   = hostname;
	this.uri        = uri;
	this.url        = [ hostname, uri ].join('/');

	this.access_id  = access_id;
	this.secret_key = secret_key;

	this.now        = (new Date()).toUTCString();
	this.data       = data || null;
	this.jsonKey    = jsonKey;
};
Request.prototype = {
	// common
	proto:        'https',
	method:       'POST',
	content_type: 'application/x-www-form-urlencoded',
	user_agent:   'NodeJS Megaplan API Client',
	// user data
	uri:          null,
	access_id:    null,
	secret_key:   null,
	signature:    null,
	auth_key:     null,
	// something speccy
	now:          null,
	data:         null,
	jsonKey:      null,

	sign: function () {
		var text = [ this.method, '', this.content_type, this.now, this.url ].join("\n");
		this.signature = b64encode(crypto.createHmac('sha1', this.secret_key).update(text).digest('hex'));
		this.auth_key = [ this.access_id, this.signature ].join(':');
		return this; 
	},

	send: function (done, fail) {
		var req, options;

		data = this.data && querystring.stringify(keysConvert(this.data, keyToPascalCase));

		options = {
			method: this.method,
			hostname: this.hostname,
			port: 443,
			path: '/' + this.uri,
			headers: {
				'Date': this.now, // really?
				'Accept': 'application/json',
				'User-Agent': this.user_agent,
				'Content-Length': data.length,
				'Content-Type': this.content_type
			}
		};
		if (this.auth_key) {
			options.headers['X-Authorization'] = this.auth_key;
		}

		var jkey = this.jsonKey;
		done = done || function () {};
		fail = fail || function () {};

		//console.log(options, data);

		req = https.request(options, function (res) {
			console.log('STATUS: ' + res.statusCode);
			console.log('HEADERS: ' + JSON.stringify(res.headers));
			var chunks = [];
			res.setEncoding('utf8');
			res.on('data', function (chunk) {
				console.log('BODY: ' + chunk);
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

					result = json.data || json.json || {};
					if (jkey && !result[jkey]) {
						throw "key " + jkey + " not exists in json";
					}
					return done (keysConvert(result[jkey] || result, keyToUnderscore));

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
			console.log('problem with request: ' + e.message);
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

var Client = function MegaplanClient (hostname, access_id, secret_key) {
	this.hostname   = hostname;
	this.access_id  = access_id;
	this.secret_key = secret_key;
};
var clientProto = {
	hostname:   null,
	access_id:  null,
	secret_key: null,

	parts: {
		':auth': 'BumsCommonApiV01/User/authorize.api',
		':notify': 'SdfNotify',
		':common': 'BumsCommonApiV01',
		':task': 'BumsTaskApiV01',
		':project': 'BumsProjectApiV01',
		':time': 'BumsTimeApiV01',
		':trade': 'BumsTradeApiV01',
		':staff': 'BumsStaffApiV01',
	},
	substUriPart: function (uri) {
		var parts = this.parts;
		var result = uri.replace(/^:[a-z]+/, function ($0) { if (!parts[$0]) throw "mistyped api part name"; return parts[$0]; });
		return result;
	},

	/**
	 * Authenticates the client
	 *
	 * The access_id and secret_key values are returned.  They can be stored
	 * and used later to create Client instances that don't need to log in.
	 */
	auth: function (login, password, done, fail) {
		var args = {
			'login': login,
			'password': crypto.createHash("md5").update( password ).digest('hex')
		};

		var that = this;
		this.request (':auth', args).send(function (data) {
			console.log('authed ', data);
			that.access_id = data.access_id;
			that.secret_key = data.secret_key;
			console.log(that.access_id);
			that.emit('auth', data);
			done && done (data);
		},
		function (err) {
			that.emit('auth', null, err);
			fail && fail (err);
		});

		return this;
	},

	/**
	 * Sends a request
	 *
	 * Args should be a dictionary or None; uri must not begin with a slash
	 * (e.g., ":task/Task/list.api"). If an error happens, an
	 * exception occurs.
	 */
	request: function (uri, args, jsonKey) {
		var signed = (uri !== ':auth');
		console.log('requesting uri ', uri);
		console.log('auth', this.access_id, this.secret_key); 
		if (signed && (!this.access_id || !this.secret_key)) {
			throw "Authenticate first";
		}
		var req = new Request(this.hostname, this.access_id, this.secret_key, this.substUriPart(uri), args, jsonKey);
		signed && req.sign();
		return req;
	},

    get_actual_tasks: function () {
        // Returns your active tasks as a list of dictionaries
        return this.request(':task/Task/list.api', { status: 'actual' }, 'tasks');
	},

    get_tasks_by_status: function (status) {
        // Returns your active tasks as a list of dictionaries
        return this.request(':task/Task/list.api', { status: status }, 'tasks');
	},

    get_task_details: function (task_id) {
        return this.request(':task/Task/card.api', { id: task_id });
	},

    get_task_comments: function (task_id) {
        return this.request(':common/Comment/list.api', { subject_type: 'task', subject_id: task_id });
	},

    set_reaction: function (token, message) {
        // Sets reaction by token
        return this.request(':notify/ReactionApi/do.api', { token: token, params: { text : message }});
	},

    get_projects_status: function (status) {
        return this.request(':task/Task/list.api', {status: status});
	},

    project_create: function (project) {
        return this.request(':project/Project/Create.api');
	},

    project_edit: function (project) {
        return this.request(':project/Project/edit.api');
	},

    project_action: function (project) {
        return this.request(':project/Project/action.api');
	},

    employee_list: function () {
        return this.request(':staff/Employee/list.api');
	},

    employee_card: function () {
        return this.request(':staff//Employee/card.api');
	},

    employee_create: function () {
        return this.request(':staff//Employee/create.api');
	},

    employee_edit: function () {
        return this.request(':staff//Employee/edit.api');
	},

    departament_list: function () {
        return this.request(':staff//Department/list.api');
	},

    todolist: function () {
        return this.request(':time/TodoList/list.api');
	},

    todolist_create: function (name) {
        return this.request(':time/TodoList/create.api', {name: name});
	},

    todolist_edit: function () {
        return this.request(':time/TodoList/edit.api');
	},

    todolist_delete: function () {
        return this.request(':time/TodoList/delete.api');
	},

    event_list: function () {
        return this.request(':time/Event/list.api');
	},

	add_online_store: function () {
		return this.request(':trade/Deal/createFromOnlineStore.api');
	}

};

inherits(Client, EventEmitter);
for (var i in clientProto) {
	Client.prototype[i] = clientProto[i];
}


module.exports = {
	'Request': Request,
	'Client': Client
};
