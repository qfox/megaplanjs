/*jshint laxbreak:true, laxcomma:true, boss:true, strict:false, devel:true, smarttabs:true, onecase:true */

var inherits = require('util').inherits
  , EventEmitter = require('events').EventEmitter
  , Request = require('./request.js')
  , ServerConf = require('./serverconf.js')
  , dicts = require('./dicts.js')
  , utils = require('../utils.js');

/**
 * @class MegaplanClient
 * @classdesc Client class that stores authentication and have some useful methods.
 * 
 * Класс пользователя, который хранит авторизацию и включает в себя остальные методы для работы с API.
 * 
 * [Official API documentaion]{@link https://help.megaplan.ru/API}
 *
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
/** @lends MegaplanClient */
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
	 * Sends a request.
	 * 
	 * Посылает запрос.
	 * 
	 * @private
	 * @param {String} uri URL to send request to. URL для отправки запрса
	 * @param {Object} [data] Data to send in request. Данные для запроса
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
	 * Adds a comment to a task/project/contractor/...
	 * 
	 * Добавляет комментарий к задаче/проекту/клиенту/...
	 *
	 * [More info]{@link https://help.megaplan.ru/API_comment_create}
	 * 
	 * @private
	 * @param {String} type One of :subject_types. Один из :subject_types
	 * @param {Number} id ID of subject item. ID задачи/проекта/клиента/...
	 * @param {String} text Content of a comment. Содержания комментария.
	 * @param {String} hours Time spent for a subject item (task usually).
	 * Время, потраченное на эту позицию (обычно задача).
	 * @returns {MegaplanRequest}
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
	 
	 * @event auth
	 * @description
	 * Params: Object - o hash with access_id, secrey_key, and some other auth information on success or error on fail.
	 * 
	 * Параметры: Объект - хеш из access_id, secret_key и некоторая другая информация об авторизации при удачном входе
	 * или об ошибке
	 *
	 * [More info]{@link https://help.megaplan.ru/API_authorization}
	 */
	EVN_AUTH: 'auth',

    
	/**
	 * Authenticates the client with login-pass pair
	 * If auth succeed then o.succeed will be called with object {access_id, secret_key}.
	 * These values can be stored and used later to create {MegaplanClient} instances instantly.
	 *
	 * Производит авторизацию клиента по паре логин-пароль.
	 * Если авторизация успешна, то будет вызвано событие auth с объектом {access_id, secret_key}.
	 * Эти значения могут использоваться позже для создания экземляра класса {MegaplanClient} самостоятельно.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_authorization}
	 *
	 * @param {String} login
	 * @param {String} password
	 * @param {String} one_time_key
	 * @returns {MegaplanClient}
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
	 * Instant authentication with token-secret pair.
	 *
	 * Авторизация по паре token-secret
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_authorization}
	 *
	 * @param {String} access_id
	 * @param {String} secret_key
	 * @returns {MegaplanClient}
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
	 * Global quick search.
	 *
	 * Глобальный быстрый поиск
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_search_quick}
	 *
	 * @param {String} search 
	 * @returns {MegaplanRequest}
	 */
	search: function (search) {
		(search instanceof Object) && (search = search.search || search.qs || search.text);
		return this.__request('::search/quick.api', {qs: search}, null, false);
	},

	/**
	 * Current time on server.
	 *
	 * Текущее время на сервере
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_system_datetime}
	 * 
	 * @returns {MegaplanRequest}
	 */
	datetime: function () {
		return this.__request('::system/datetime.api', null, 'datetime');
	},

	/**
	 * History.
	 * If subject_id not set, method will return history on all subjects.
	 *
	 * История.
	 * Если subject_id не установлен, метод возвращает историю по всем проектам и задачам.
	 * 
	 * More info [here (get history on one subject)]{@link https://help.megaplan.ru/API_system_datetime} and
     [here (get history on all subjects)]{@link https://help.megaplan.ru/API_history_all}
	 * 
	 * @param {Number} [subject_id] id of object
	 * @param {String} [subject_type=task] task or project
	 * @returns {MegaplanRequest}
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
	 * Feedback
	 *
	 * Обратная связь.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_system_feedback}
	 * @param {String} message 
	 * @returns {MegaplanRequest}
	 */
	feedback: function (message) {
		var o = message;
		(o instanceof Object) || (o = {
			message: message
		});
		return this.__request('::system/feedback.api', o);
	},

	/**
	 * Task creation.
	 * 
	 * Создание задачи.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_task_create}
	 *
	 * @todo Add support of attaches
	 * @param {String} [name] Название
	 * @param {String} [statement] Суть задачи
	 * @param {Number} [responsible] Код ответственного
	 * @param {String} [super_task] Код надзадачи (если число) или код проекта (если строка в формате ‘p<код проекта>’
	 * @param {Date|Object} [deadline] Дедлайн
	 * @param {Date} [dealline.datetime] День и время
	 * @param {Date} [dealline.date] Только день
	 * @param {String} [dealline.type] Тип дедлайна
	 * @param {Array} [executors] Коды соисполнителей
	 * @param {Array} [auditors] Коды аудиторов
	 * @param {Number} [severity] Код важности (с версии 2011.3 допустимо отсутствие параметра важности или важность
	 * с MasterType=high)
	 * @param {Number} [customer] Код заказчика
	 * @param {Number} [is_group] (0/1) Массовая задача (каждому соисполнителю будет создана своя задача)
	 * @param {Object} [attaches] There is no support of attaches at the moment. Sorry. Должен содержать ключ add в
	 * котором находится массив с файлами
	 * @param {Array} attaches.add Массив приложенных файлов, должен передаваться POST-запросом
	 * @param {String} attaches.add.context Данные(контент файла), закодированные с использованием MIME base64
	 * @param {String} attaches.add.name Имя файла (будет фигурировать при выводе задачи)
	 * @returns {MegaplanRequest}
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

	/** 
	 * @todo Редактирование задачи
	 * @todo Действие над задачей
	 * @todo Допустимые действия над задачей
	 * @todo Допустимые действия для списка задач
	 * @todo Добавить задачу в избранное
	 * @todo Запрос на изменение дедлайна
	 * @todo Принять или отклонить запрос на изменение дедлайна
	 * @todo Изменение соисполнителей
	 * @todo Изменение аудиторов
	 * @todo Делегирование задачи
	 * @todo Проверка прав на делегирование задачи
	 * @todo Список пользователей, которым можно делегировать задачу
	 * @todo Список задач и проектов, которые можно указывать как надзадачи для других задач
	 * @todo Список проектов, которые можно указывать как надпроекты для других задач
	 * @todo Конвертация задачи в проект
    */

	/**
	 * Returns your tasks as a list of objects.
	 * 
	 * Список задач как список объектов.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_task_list}
	 *
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
	 * @returns {MegaplanRequest}
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
	 * Detailed task.
	 * 
	 * Карточка задачи.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_task_card}
	 *
	 * @param {Number} id Task ID
	 * @returns {MegaplanRequest}
	 */
	task: function (task_id) {
		return this.__request('::task/card.api', { id: task_id });
	},

	/**
	 * Get task comments.
	 * 
	 * Получить список комментариев к задаче.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_comment_list}
	 *
	 * @param {Number} subject_id Task ID
	 * @returns {MegaplanRequest}
	 */
	task_comments: function (task_id) {
		return this.__request('::comment/list.api', { subject_type: 'task', subject_id: task_id });
	},

	/**
	 * Send comment to a task.
	 * 
	 * Написание комментария к задаче.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_comment_create}
	 *
	 * @param {Number} subject_id Task ID. ID задачи
	 * @param {String} text Content. Содержание
	 * @param {String} [hours] Time spend to a task. Время, потраченное на задачу
	 * @returns {MegaplanRequest}
	 */
	task_comment_create: function (task_id, text, hours) {
		return this.__add_comment("task", task_id, text, hours || 0);
	},

	// Sets reaction by token
	react: function (token, message) {
		return this.__request('::reaction/do.api', { token: token, params: { text : message }});
	},


	/**
	 * Returns projects as a list of objects.
	 * 
	 * Список проектов как список объектов.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_project_list}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	projects: function (o) {
		o = o || {};
		return this.__request('::project/list.api', utils.objectFilter(o));
	},

    
	/**
	 * Create project.
	 * 
	 * Создает проект.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_project_create}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	project_create: function (o) {
		o = o || {};
		return this.__request('::project/Create.api', utils.objectFilter(o));
	},

    
	/**
	 * Edit project.
	 * 
	 * Редактирует проект.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_project_edit}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	project_edit: function (o) {
		return this.__request('::project/edit.api', utils.objectFilter(o));
	},

    
	/**
	 * Make action on project.
	 * 
	 * Производит действие над проектом.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_project_action}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	project_action: function (o) {
		return this.__request('::project/action.api', utils.objectFilter(o));
	},

    
	/**
	 * Send comment to a project.
	 * 
	 * Написание комментария к проекту.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_comment_create}
	 *
	 * @param {Number} project_id Project ID. ID проекта
	 * @param {String} text Content. Текст комментария
	 * @param {String} [hours] Time spend to a project. Время, потраченное на проект
	 * @returns {MegaplanRequest}
	 */
	project_comment_create: function (project_id, text, hours) {
		return this.__add_comment("project", project_id, text, hours || 0);
	},
    
    
    
	/**
	 * Get list of todolists.
	 * 
	 * Получает список списков дел.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_todolist_list}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	todolists: function (o) {
		return this.__request('::todo/list.api', utils.objectFilter(o));
	},

	/**
	 * Create todolist.
	 * 
	 * Создание списка дел.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_todolist_create}
	 *
	 * @param {String} name Name of new todolist. Имя нового списка дел
	 * @returns {MegaplanRequest}
	 */
	todolist_create: function (name) {
		var o = name;
		(o instanceof Object) || (o = {
			name: name
		});
		return this.__request('::todo/create.api', utils.objectFilter(o));
	},

    
	/**
	 * Edit todolist.
	 * 
	 * Редактирует список дел.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_todolist_edit}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	todolist_edit: function (o) {
		return this.__request('::todo/edit.api', utils.objectFilter(o));
	},

    
	/**
	 * Delete todolist.
	 * 
	 * Удаляет список дел.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_todolist_delete}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	todolist_delete: function (o) {
		return this.__request('::todo/delete.api', utils.objectFilter(o));
	},


	/**
	 * Get list of events.
	 * 
	 * Получает список событий.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_event_list}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	events: function (o) {
		return this.__request('::event/list.api', utils.objectFilter(o));
	},
    
    
	/**
	 * Get card of event.
	 * 
	 * Получает карточку события.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_event_card}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	event_card: function (o) {
		return this.__request('::event/card.api', utils.objectFilter(o));
	},

    
	/**
	 * Create a event.
	 * 
	 * Создает событие.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_event_create}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	event_create: function (o) {
		return this.__request('::event/create.api', utils.objectFilter(o));
	},

    
	/**
	 * Edit a event.
	 * 
	 * Редактирует событие.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_event_edit}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	event_edit: function (o) {
		return this.__request('::event/edit.api', utils.objectFilter(o));
	},


	/**
	 * Get list of employees.
	 * 
	 * Получает список сотрудников.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_employee_list}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	employees: function (o) {
		return this.__request('::employee/list.api', utils.objectFilter(o));
	},

    
	/**
	 * Get card of employee.
	 * 
	 * Получает карточку сотрудника.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_employee_card}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	employee_card: function (o) {
		return this.__request('::employee/card.api', utils.objectFilter(o));
	},

    
	/**
	 * Create a employee.
	 * 
	 * Создает сотрудника.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_employee_create}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	employee_create: function (o) {
		return this.__request('::employee/create.api', utils.objectFilter(o));
	},

    
	/**
	 * Edit a employee.
	 * 
	 * Редактирует сотрудника.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_employee_edit}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	employee_edit: function (o) {
		return this.__request('::employee/edit.api', utils.objectFilter(o));
	},


	/**
	 * Get list of departments.
	 * 
	 * Получает список отделов.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_department_list}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	departments: function (o) {
		return this.__request('::department/list.api', utils.objectFilter(o));
	},



	/**
	 * Make import information to Megaplan. Method created for internet shops.
	 * 
	 * Делает импорт информации в Мегаплан. Метод создан для интернет магазинов.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_online_store}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	add_online_store: function (o) {
		return this.__request(':trade/Deal/createFromOnlineStore.api', utils.objectFilter(o));
	},
    
    
    
    

	/**
     * Get list of contractors.
     * 
	 * Получает список клиентов.
	 * 
	 * [Mode info]{@link https://help.megaplan.ru/API_contractor_list}
	 * 
	 * @param {Number} [filter_id] Идентификатор фильтра
	 * @param {String} [search] Условие поиска
	 * @param {Number} [limit] Сколько выбрать событий (LIMIT)
	 * @param {Number} [offset] Начиная с какого выбирать события (OFFSET)
	 * @returns {MegaplanRequest}
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
    
    
	/**
	 * Create or edit contractor.
	 * 
	 * Создает или изменяет клиента.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_contractor_save}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	contractor_save: function (o) {
		return this.__request('::contractor/save.api', utils.objectFilter(o));
	},

    
	/**
	 * Get card of contractor.
	 * 
	 * Получает карточку клиента.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_contractor_card}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	contractor_card: function (o) {
		return this.__request('::contractor/card.api', utils.objectFilter(o));
	},

    
	/**
	 * Delete contractor.
	 * 
	 * Удаляет клиента.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_contractor_delete}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	contractor_delete: function (o) {
		return this.__request('::contractor/delete.api', utils.objectFilter(o));
	},

    
	/**
	 * Get list of contractor`s fields.
	 * 
	 * Получает список полей клиента.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_Contractor_fields}
	 *
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	contractor_list_fields: function () {
		return this.__request('::contractor/listFields.api');
	},

    
	/**
	 * Send comment to a contractor.
	 * 
	 * Написание комментария к клиенту.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_comment_create}
	 *
	 * @param {Number} contractor_id Contractor ID. ID клиента
	 * @param {String} text Content. Текст комментария
	 * @param {String} [hours] Time spend to a task. Время, потраченное на клиента
	 * @returns {MegaplanRequest}
	 */
	contractor_comment_create: function (contractor_id, text, hours) {
		if (!contractor_id || !text) {
			throw "Can't post empty comment to nothing";
		}
		return this.__request("::comment/create.api", {
			subject_type: 'contractor',
			subject_id: contractor_id,
			model: {
				text: text,
				work: hours || 0
			}
		});
	},



	/**
     * Get list of deals.
     * 
     * Получает список сделок.
     * 
     * [More info]{@link https://help.megaplan.ru/API_deal_list}
     * 
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	deals: function (o) {
		return this.__request('::deal/list.api', utils.objectFilter(o));
	},

    
	/**
     * Create or edit deal.
     * 
     * Создает или редактирует сделку.
     * 
     * [More info]{@link https://help.megaplan.ru/API_deal_save}
     * 
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	deal_save: function (o) {
		return this.__request('::deal/save.api', utils.objectFilter(o));
	},

    
	/**
     * Get card of deal.
     * 
     * Получает карточку сделки.
     * 
     * [More info]{@link https://help.megaplan.ru/API_deal_card}
     * 
	 * @param {Object} o parameters of request. More info in official documentation. Параметры запроса. Смотрите
	 * официальную документацию для получения большей информации
	 * @returns {MegaplanRequest}
	 */
	deal_card: function (o) {
		return this.__request('::deal/card.api', utils.objectFilter(o));
	},
	
    
	/**
	 * Send comment to a deal.
	 * 
	 * Написание комментария к сделке.
	 * 
	 * [More info]{@link https://help.megaplan.ru/API_comment_create}
	 *
	 * @param {Number} deal_id Deal ID. ID сделки
	 * @param {String} text Content. Текст комментария
	 * @param {String} [hours] Time spend to a task. Время, потраченное на сделку
	 * @returns {MegaplanRequest}
	 */
	deal_comment_create: function (deal_id, text, hours) {
		if (!deal_id || !text) {
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
