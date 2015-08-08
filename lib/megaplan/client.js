/*jshint laxbreak:true, laxcomma:true, boss:true, strict:false, devel:true, smarttabs:true, onecase:true */

var inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter
  , Request = require('./request.js')
  , ServerConf = require('./serverconf.js')
  , dicts = require('./dicts.js')
  , utils = require('../utils.js');

/**
 * Client class that stores authentication and have some useful methods
 * @class MegaplanClient
 * @constructor
 * @param {String|MegaplanServerConf} server Hostname or Object<host[, port, scheme, auth, user, pass]>
 * @param {String} [access_id]
 * @param {String} [secret_key]
 * @param {Function} [success_callback]
 * @param {Function} [fail_callback]
 */
var Client = function MegaplanClient (server, access_id, secret_key, success_callback, fail_callback) {
	// super call
	EventEmitter.call(this);

	var o = server;
	(o instanceof Object && !ServerConf.isSelfLikeObject(o)) || (o = {
		server: server,
		access_id: access_id,
		secret_key: secret_key,
		success_callback: success_callback,
		fail_callback: fail_callback
	});

	// set initials
	this.server = new ServerConf(o.server);
	this.callbacks(o.success_callback, o.fail_callback);
	this.auth2(o);
};
var clientProto = {
	server: null,

	access_id:  null,
	secret_key: null,

	request_success_callback: null,
	request_fail_callback:    null,

	callbacks: function (success, fail) {
		this.request_success_callback = success;
		this.request_fail_callback = fail;
	},

	/**
	 * Sends a request
	 * @class MegaplanClient
	 * @method __request
	 * @private
	 * @param {String} uri URL to send request to
	 * @param {Object} [data] Data to send in request
	 * @param {String|Function} [res_data_filter]
	 * @param {Function} [req_data_filter]
	 * @param {MegaplanRequest}
	 */
	__request: function (uri, data, res_data_filter, req_data_filter) {
		var signed = (uri !== '::auth');

		//console.log({'requesting uri ': uri, 'data': data, 'res_data_filter': res_data_filter, 'req_data_filter': req_data_filter, 'signed': signed, 'auth': [this.access_id, this.secret_key]});

		if (signed && (!this.access_id || !this.secret_key)) {
			throw "Authenticate first";
		}

		uri = utils.subst_uri(uri);
		data = data || {};

		var req = new Request(this.server, this.access_id, this.secret_key, uri, data, res_data_filter, req_data_filter);

		req.callbacks(this.request_success_callback, this.request_fail_callback);
		signed && req.sign();

		return req;
	},

	/**
	 * Adds a comment to a task/project
	 * @class MegaplanClient
	 * @method __add_comment
	 * @private
	 * @param {String} type One of :subject_types
	 * @param {Number} id ID of subject item
	 * @param {String} text Content of a comment
	 * @param {String} hours Time spent for a subject item (task usually)
	 * @return {MegaplanRequest}
	 */
	__add_comment: function (type, id, text, hours) {
		if (!id || !text) {
			throw "Can't post empty comment to nothing";
		}
		return this.__request("::comment/create.api", {
			subject_type: type || 'task',
			subject_id: utils.normalize_id(id),
			model: {
				text: text,
				work: hours
			}
		});
	},

	/**
	 * @class MegaplanClient
	 * @event auth
	 * @params {Object} o hash with access_id, secrey_key, and some other auth information on success or error on fail 
	 */
	EVN_AUTH: 'auth',

	/**
	 * Authenticates the client with login-pass pair
	 * If auth succeed then o.succeed will be called with object {access_id, secret_key}.
	 * These values can be stored and used later to create {MegaplanClient} instances instantly.
	 *
	 * @class MegaplanClient
	 * @method auth
	 * @param {String} login
	 * @param {String} password
	 * @param {String} one_time_key
	 * @return {MegaplanClient}
	 */
	auth: function (login, password, one_time_key) {
		var that = this, o, args;
		o = (login instanceof Object) ? (login) : {
			login: login,
			password: password,
			one_time_key: one_time_key
		};

		if ((!o.login || !o.password) && !o.one_time_key) {
			throw "No login/password information provided to auth method";
		}

		if (o.one_time_key) {
			args = {
				one_time_key: one_time_key
			};
		}
		else {
			args = {
				login: o.login,
				password: utils.md5(o.password)
			};
		}
		this.__request ('::auth', args).send(
			function (data) {
				that.auth2(data);
				o.success && o.success (data);
			},
			function (err) {
				that.emit(that.EVN_AUTH, null, err);
				o.fail && o.fail (err);
			}
		);

		return this;
	},

	/**
	 * Instant authentication with token-secret pair
	 *
	 * @method auth2
	 * @param {String} access_id
	 * @param {String} secret_key
	 * @return {MegaplanClient}
	 */
	auth2: function (access_id, secret_key) {
		var that = this, o = (access_id instanceof Object) ? (access_id) : {
			access_id: access_id,
			secret_key: secret_key
		};
		if (!o.access_id && !o.secret_key) {
			return;
		}

		this.access_id = o.access_id;
		this.secret_key = o.secret_key;

		process.nextTick(function () {
			that.emit(that.EVN_AUTH, o);
		});

		return this;
	},

	/**
	 * Global quick search
	 *
	 * @class MegaplanClient
	 * @method search
	 * @param {String} search
	 * @return {MegaplanRequest}
	 */
	search: function (search) {
		(search instanceof Object) && (search = search.search || search.qs || search.text);
		return this.__request('::search/quick.api', {qs: search}, null, false);
	},

	/**
	 * Current time on server
	 * @class MegaplanClient
	 * @method datetime
	 * @return {MegaplanRequest}
	 */
	datetime: function () {
		return this.__request('::system/datetime.api', null, 'datetime');
	},

	/**
	 * History
	 * @class
	 * @method history
	 * @param {Number} [subject_id]
	 * @param {String} [subject_type=task]
	 * @return {MegaplanRequest}
	 */
	history: function (id, type) {
		var o = id;
		(o instanceof Object) || (o = {
			subject_type: type || 'task',
			subject_id: utils.normalize_id(id)
		});
		var method = o.subject_id ? '/list.api' : '/all.api';
		return this.__request('::history'+method, o, 'changes');
	},

	/**
	 * Feedback (?)
	 * @class
	 * @method history
	 * @param {String} message
	 * @return {MegaplanRequest}
	 */
	feedback: function (message) {
		var o = message;
		(o instanceof Object) || (o = {
			message: message
		});
		return this.__request('::system/feedback.api', o);
	},

	/**
	 * Task creation
	 * Создание задачи
	 *
	 * @class MegaplanClient
	 * @method task_create
	 * @todo Add support of attaches
	 * @param {String} [name] Название
	 * @param {String} [statement] Суть задачи
	 * @param {Number} [responsible] Код ответственного
	 * @param {String} [super_task] Код надзадачи (если число) или код проекта (если строка в формате ‘p<код проекта>’
	 * @param {Date|Object} [deadline] Дедлайн
	 *   @param {Date} [datetime] День и время
	 *   @param {Date} [date] Только день
	 *   @param {String} [type] Тип дедлайна
	 * @param {Array} [executors] Коды соисполнителей
	 * @param {Array} [auditors] Коды аудиторов
	 * @param {Number} [severity] Код важности (с версии 2011.3 допустимо отсутствие параметра важности или важность с MasterType=high)
	 * @param {Number} [customer] Код заказчика
	 * @param {Number} [is_group] (0/1) Массовая задача (каждому соисполнителю будет создана своя задача)
	 * @param {Object} [attaches] There is no support of attaches at the moment. Sorry.
	 *   Должен содержать ключ add в котором находится массив с файлами
	 *   @param {Array} add Массив приложенных файлов, должен передаваться POST-запросом
	 *     @param {String} context Данные(контент файла), закодированные с использованием MIME base64
	 *     @param {String} name Имя файла (будет фигурировать при выводе задачи)
	 * @return {MegaplanRequest}
	 */
	task_create: function (name, statement, responsible, super_task, deadline, executors, auditors, severity, customer, is_group/*, attaches*/) {
		var o = name;
		(o instanceof Object) || (o = {
			name: name,
			statement: statement,
			responsible: responsible,
			super_task: super_task,
			deadline: (deadline||{}).datetime || deadline,
			deadline_date: (deadline||{}).date,
			deadline_type: (deadline||{}).type,
			executors: executors,
			auditors: auditors,
			severity: severity,
			customer: customer,
			is_group: is_group/*,
			attaches: attaches*/
		});
		o.responsible = utils.normalize_id(o.responsible);
		o.super_task = utils.normalize_id(o.super_task);
		o.executors = (o.executors && o.executors.map) ? o.executors.map(utils.normalize_id) : null;
		o.auditors = (o.auditors && o.auditors.map) ? o.auditors.map(utils.normalize_id) : null;
		o.is_group = o.is_group ? 1 : 0;
		o.customer = utils.normalize_id(o.customer);

		// todo: add support of attaches object
		delete o.attaches;

		return this.__request('::task/create.api', {model: utils.objectFilter(o)}, 'task');
	},

	// todo:
	// Редактирование задачи
	// Действие над задачей
	// Допустимые действия над задачей
	// Допустимые действия для списка задач
	// Добавить задачу в избранное
	// Запрос на изменение дедлайна
	// Принять или отклонить запрос на изменение дедлайна
	// Изменение соисполнителей
	// Изменение аудиторов
	// Делегирование задачи
	// Проверка прав на делегирование задачи
	// Список пользователей, которым можно делегировать задачу
	// Список задач и проектов, которые можно указывать как надзадачи для других задач
	// Список проектов, которые можно указывать как надпроекты для других задач
	// Конвертация задачи в проект

	/**
	 * Returns your tasks as a list of objects
	 * Список задач
	 *
	 * @class MegaplanClient
	 * @method tasks
	 * @param {String} [status=any] Статус
	 * @param {String} [folder=all] Папка
	 * @param {Number} [favorites_only=0] Только избранное
	 * @param {String} [search] Строка поиска
	 * @param {Boolean} [detailed=false] Нужно ли показывать в списке задач все поля из карточки задачи
	 * @param {Boolean} [only_actual=false] Если true, то будут выводиться только незавершенные задачи
	 * @param {String} [filter_id] Код фильтра
	 * @param {Boolean} [count] Вернуть кол-во задач, удовлетворяющих условиям, вместо списка
	 * @param {Number} [employee_id] Код сотрудника, для которого ищем задачи
	 * @param {String} [sort_by] Поле модели задачи по которому производить сортировку результата
	 * @param {String} [sort_order=asc] Порядок сортировки: asc (по возрастанию), desc (по убыванию)
	 * @param {Boolean} [show_actions] Нужно ли показывать в списке возможные действия над задачей
	 * @param {Number} [limit] Сколько выбрать задач (LIMIT)
	 * @param {Number} [offset] Начиная с какой выбирать задачи (OFFSET)
	 * @return {MegaplanRequest}
	 */
	tasks: function (status, folder, favorites_only, search, detailed, only_actual, filter_id, count, employee_id, sort_by, sort_order, show_actions, limit, offset) {
		var o = status;
		(o instanceof Object) || (o = {
			status: status || 'actual',
			folder: folder || 'incoming',
			favorites_only: favorites_only ? 1 : 0,
			search: search,
			detailed: !!detailed,
			only_actual: only_actual || only_actual === undefined,
			filter_id: filter_id,
			count: !!count,
			employee_id: utils.normalize_id(employee_id),
			sort_by: sort_by,
			sort_order: (sort_order||'').toLowerCase() === 'desc' ? 'desc' : 'asc',
			show_actions: !!show_actions,
			limit: limit,
			offset: offset
		});

		return this.__request('::task/list.api', utils.objectFilter(o), 'tasks');
	},

	/**
	 * Detailed task
	 * Карточка задачи
	 *
	 * @class MegaplanClient
	 * @method task
	 * @param {Number} id Task ID
	 * @return {MegaplanRequest}
	 */
	task: function (task_id) {
		return this.__request('::task/card.api', { id: task_id });
	},

	/**
	 * Task comments
	 * Комментарии к задаче
	 *
	 * @class MegaplanClient
	 * @method task_comments
	 * @param {Number} subject_id Task ID
	 * @return {MegaplanRequest}
	 */
	task_comments: function (task_id) {
		return this.__request('::comment/list.api', { subject_type: 'task', subject_id: task_id });
	},

	/**
	 * Send comment to a task
	 * Написние комментария к задаче
	 *
	 * @class MegaplanClient
	 * @method create_task_comment
	 * @param {Number} subject_id Task ID
	 * @param {String} text Content
	 * @param {String} [hours] Time spend to a task
	 * @return {MegaplanRequest}
	 */
	task_comment_create: function (task_id, text, hours) {
		return this.__add_comment("task", task_id, text, hours || 0);
	},

	// Sets reaction by token
	react: function (token, message) {
		return this.__request('::reaction/do.api', { token: token, params: { text : message }});
	},


	// == projects ==
	projects: function (o) {
		o = o || {};
		return this.__request('::project/list.api', utils.objectFilter(o));
	},

	project_create: function (o) {
		o = o || {};
		return this.__request('::project/Create.api', utils.objectFilter(o));
	},

	project_edit: function (o) {
		return this.__request('::project/edit.api', utils.objectFilter(o));
	},

	project_action: function (o) {
		return this.__request('::project/action.api', utils.objectFilter(o));
	},

	project_comment_create: function (project_id, text, hours) {
		return this.__add_comment("project", project_id, text, hours || 0);
	},


	// == todo and events ==

	todolists: function (o) {
		return this.__request('::todo/list.api', utils.objectFilter(o));
	},

	/**
	 * Create todolist
	 * Создание списка дел
	 *
	 * @class MegaplanClient
	 * @method todolist_create
	 * @param {String} name Name of new todolist
	 * @return {MegaplanRequest}
	 */
	todolist_create: function (name) {
		var o = name;
		(o instanceof Object) || (o = {
			name: name
		});
		return this.__request('::todo/create.api', utils.objectFilter(o));
	},

	todolist_edit: function (o) {
		return this.__request('::todo/edit.api', utils.objectFilter(o));
	},

	todolist_delete: function (o) {
		return this.__request('::todo/delete.api', utils.objectFilter(o));
	},

	events: function (o) {
		return this.__request('::event/list.api', utils.objectFilter(o));
	},


	// == employers and departments ==
	employees: function (o) {
		return this.__request('::employee/list.api', utils.objectFilter(o));
	},

	employee_card: function (o) {
		return this.__request('::employee/card.api', utils.objectFilter(o));
	},

	employee_create: function (o) {
		return this.__request('::employee/create.api', utils.objectFilter(o));
	},

	employee_edit: function (o) {
		return this.__request('::employee/edit.api', utils.objectFilter(o));
	},

	departments: function (o) {
		return this.__request('::department/list.api', utils.objectFilter(o));
	},



	// == tradings ==
	add_online_store: function (o) {
		return this.__request(':trade/Deal/createFromOnlineStore.api', utils.objectFilter(o));
	},



	// == contractors ==

	/**
	 * @class MegaplanClient
	 * @method contractors
	 * @param {Number} [filter_id] Идентификатор фильтра
	 * @param {String} [search] Условие поиска
	 * @param {Number} [limit] Сколько выбрать событий (LIMIT)
	 * @param {Number} [offset] Начиная с какого выбирать события (OFFSET)
	 * @return {MegaplanRequest}
	 */
	contractors: function (filter_id, search, limit, offset) {
		var o = filter_id;
		(o instanceof Object) || (o = {
			filter_id: filter_id,
			qs: search,
			limit: limit,
			offset: offset
		});

		return this.__request('::contractor/list.api', utils.objectFilter(o), 'clients');
	},
	
	contractor_save: function (o) {
		return this.__request('::contractor/save.api', utils.objectFilter(o));
	},
	
	contractor_card: function (o) {
		return this.__request('::contractor/card.api', utils.objectFilter(o));
	},
	
	contractor_delete: function (o) {
		return this.__request('::contractor/delete.api', utils.objectFilter(o));
	},
	
	contractor_list_fields: function () {
		return this.__request('::contractor/listFields.api');
	},
	
	
	
	// == deals ==

	/**
	 * @class MegaplanClient
	 * @method deals
	 * @param {Object} [o] Параметры запроса
	 * @return {MegaplanRequest}
	 */
	deals: function (o) {
		return this.__request('::deal/list.api', utils.objectFilter(o));
	},
	
	deal_save: function (o) {
		return this.__request('::deal/save.api', utils.objectFilter(o));
	},
	
	deal_card: function (o) {
		return this.__request('::deal/card.api', utils.objectFilter(o));
	},
	
	deal_comment_create: function (deal_id, text, hours) {
		if (!id || !text) {
			throw "Can't post empty comment to nothing";
		}
		return this.__request("::comment/create.api", {
			subject_type: 'deal',
			subject_id: deal_id,
			model: {
				text: text,
				work: hours || 0
			}
		});
	},

};

inherits(Client, EventEmitter);
for (var i in clientProto) {
	clientProto.hasOwnProperty(i) && (Client.prototype[i] = clientProto[i]);
}

module.exports = Client;
