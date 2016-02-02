// Dictionaries for megaplanjs library
module.exports = {

	// uri shortcuts
	uri_shortcuts: {
		':notify':    'SdfNotify',
		':common':    'BumsCommonApiV01',
		':task':      'BumsTaskApiV01',
		':project':   'BumsProjectApiV01',
		':time':      'BumsTimeApiV01',
		':trade':     'BumsTradeApiV01',
		':staff':     'BumsStaffApiV01',
		':crm':       'BumsCrmApiV01',

		'::user':     ':common/User',
		'::auth':     ':common/User/authorize.api',
		'::system':   ':common/System',
		'::search':   ':common/Search',
		'::history':  ':common/History',
		'::tags':     ':common/Tags',
		'::task':     ':task/Task',
		'::comment':  ':common/Comment',
		'::reaction': ':notify/ReactionApi',
		'::project':  ':project/Project',
		'::todo':     ':time/TodoList',
		'::event':    ':time/Event',
		'::employee': ':staff/Employee',
		'::department': ':staff/Department',
		'::contractor': ':crm/Contractor',
		'::deal': ':trade/Deal'
	},

	// megaplan task folders
	folders: [
		'incoming',
		'responsible',
		'executor',
		'owner',
		'auditor',
		'all'
	],

	// megaplan task statuses
	task_statuses: [
		'actual',
		'inprocess',
		'new',
		'overdue',
		'done',
		'delayed',
		'completed',
		'failed',
		'any'
	],

	// megaplan action types
	action_types: [
		'act_accept_task',
		'act_reject_task',
		'act_accept_work',
		'act_reject_work',
		'act_done',
		'act_pause',
		'act_resume',
		'act_cancel',
		'act_expire',
		'act_renew'
	],

	// megaplan subject types
	subject_types: [
		'task',
		'project'
	],

	// megaplan orders
	order_type: [
		'asc',
		'desc'
	],

	// inner errors
	request_errors: {
		':hangup': 'connection closed unexpectedly',
		':invalidjson': 'received invalid json string',
		':network': 'request dropped'
	}

};
