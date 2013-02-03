// Pack of helpers

var crypto = require('crypto')
  , dicts = require('lib/megaplan/dicts.js')
  , utils
  , createDate;

createDate = function (date) {
	if (date === '') return null;
	return new Date(date);
};

utils = {
	// Just a base64.encode
	b64encode: function (data) {
		return (new Buffer(data)).toString('base64');
	},

	md5: function (text) {
		return crypto.createHash("md5").update( text ).digest('hex');
	},

	// Converts "abc_def" string to "AbcDef"
	toPascalCase: function (s) {
		return String(s).substr(0, 1).toUpperCase() + String(s).substr(1).replace(/_[a-z]/ig, function ($0) { return $0.substr(1,1).toUpperCase(); });
	},

	// Converts "AbcDef" string to "abc_def"
	toUnderscore: function (s) {
		return String(s).replace(/[A-Z]/g, function ($0) { return "_" + $0.toLowerCase(); }).replace(/^_/,'');
	},

	is_native: function (h) {
		return typeof h !== 'object' || h instanceof Array || h instanceof Date || h instanceof String || h instanceof Boolean || h instanceof Number || h instanceof Function || h instanceof RegExp;
	},

	// Creates an object and fills it by :h but before executes converter on :h.key
	convertKeys: function (h, converter) {
		var r = {};
		if (utils.is_native(h) && !(h instanceof Array)) {
			return h;
		}
		for (var k in h) {
			(r[converter(k)] = utils.convertKeys(h[k], converter));
		}
		return r;
	},

	// Converts an object with under_scored keys to an object with PascalCased keys
	convertKeysToPascalCase: function (h) {
		return utils.convertKeys(h, utils.toPascalCase);
	},

	// Converts an object with PascalCased keys to an object with under_scored keys
	convertKeysToUnderscore: function (h) {
		return utils.convertKeys(h, utils.toUnderscore);
	},

	objectFilter: function (h, callback) {
		var r = {};
		callback = callback || function (v, k) { return v == null; };
		for (var i in h) {
			if (!h.hasOwnProperty(i)) continue;
			if (!callback(h[i], i)) r[i] = h[i];
		}
		return r;
	},

	// megaplan specific helpers below

	keysToConvertTo: {
		'time_created': createDate,
		'time_updated': createDate,
		'fire_day': createDate,
		'start_time': createDate,
		'activity': createDate,
		'appearance_day': createDate,
		'birthday': createDate
	},
	convertValuesToNatives: function (h) {
		if (utils.is_native(h) && !(h instanceof Array)) {
			return h;
		}
		for (var k in h) {
			if (!h.hasOwnProperty(k)) continue;
			if ((typeof h[k] === 'string') || (h[k] instanceof String)) {
				if (!utils.keysToConvertTo[k]) continue;
				var conv = utils.keysToConvertTo[k];
				h[k] = h[k] === '' ? null : conv(h[k]);
			} else {
				h[k] = utils.convertValuesToNatives(h[k]);
			}
		}
		return h;
	},

	// replaces shortcuts in :uri string with their values
	subst_uri: function (uri) {
		var parts = dicts.uri_shortcuts;
		var result = String(uri);
		[ /^::[a-z]+/, /^:[a-z]+/ ].forEach (function (v) {
			result = result.replace(v, function ($0) {
				return parts[$0] || '';
			});
		});
		return result;
	},

	// secret signer method
	make_signature: function (key, text) {
		return utils.b64encode(crypto.createHmac('sha1', key).update( text ).digest('hex'));
	},

	// megaplan ids must be higher than 1000000
	normalize_id: function (id) {
		if (id === null || id === undefined) {
			return id;
		}
		var is_project = /^p\d+/.test(String(id));
		is_project && (id = id.replace(/^p/, ''));
		id = Number(id) + (Number(id) < 1000000 ? 1000000 : 0);
		return is_project ? 'p' + id : id;
	}

};

module.exports = utils;
