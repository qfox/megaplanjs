
var megaplan = require ('lib/megaplan.js')
  , config = require ('config.js');

var client = new megaplan.Client(config.host).auth(config.user, config.pass);

client.on('auth', function (res, err) {
	console.log('authenticated', res, err);

	client.get_actual_tasks().send(function (tasks) {
		console.log(tasks);
	}, function (err) {
		console.log(err);
	});
});
