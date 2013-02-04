
var MegaplanClient = require ('./lib/megaplan.js').Client
  , config = require ('config.js')
  , util = require('util');

var client = new MegaplanClient(config.host).auth(config.user, config.pass);

client.on('auth', function (res, err) {
	util.debug('authenticated', res, err);

	// set default callback to print out the result to console
	client.callbacks(function (out) {
		util.debug(util.inspect(out, false, 5));
	}, function (err) {
		util.error(err);
		(err.error||{}).message && util.error('message', err.error.message);
	});

	// show user's tasks
	client.tasks({folder: 'owner'}).send();

	// show all visible tasks using custom handler
	client.tasks().send(function (tasks) {
		util.puts(util.inspect(tasks));
	});

	// global serach for a Keyword
	client.search('Keyword').send();

	// fetch employees
	client.employees().send();

	// what is time on the other side?
	client.datetime().send();

	// task creation
	var myId = 2;
	client
	.task_create('Testing: ASAP buy an elephant', 'We need an elephant to go to Persia', myId)
	.send(function (out) {
		newTaskId = out.id;
		util.puts('task created with id: ', out.id);
		client.task_create({
			name: 'Testing: Look for a good elephants on the market',
			statement: 'Go to the market and look for a good, big, mighty elephants to buy',
			responsible: myId,
			super_task, out.id,
			deadline: {datetime: new Date(Date.now() + 135*60*1000 /* 135 minutes after now */)},
			auditors: [0, myId],
			severity: 'high'
		}).send(function (out) {
			// fetch history for a currently created task
			client.history(newTaskId).send();
		});
	});

	// fetch history for a task with id 1 (1000001)
	client.history(1).send();

});
