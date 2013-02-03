module.exports = {

	/* doc.replace(/^([a-z]+)\t([a-z а-я\(\)<>,]+)\t(.*?)$/i, "$1: '$3', // $2"); */

	folders: {
		incoming: 'входящие',
		responsible: 'ответственный',
		executor: 'соисполнитель',
		owner: 'исходящие',
		auditor: 'аудируемые',
		all: 'все'
	},

	task_statuses: {
		actual: 'актуальные',
		inprocess: 'в процессе',
		"new": 'новые',
		overdue: 'просроченные',
		done: 'условно завершенные',
		delayed: 'отложенные',
		completed: 'завершенные',
		failed: 'проваленные',
		any: 'любые'
	},

	task_fields_full: {
		id: 'ID задачи',
		name: 'Название', // string
		status: 'Статус', // string
		deadline: 'Дедлайн', // datetime
		owner: 'Постановщик (сотрудник)', // object (Id, Name)
		responsible: 'Ответственный (сотрудник)', // object (Id, Name)
		severity: 'Важность', // string
		super_task: 'Надзадача', // object (Id, Name)
		project: 'Проект', // object (Id, Name)
		favorite: 'В избранном', // integer
		time_created: 'Время создания', // datetime
		time_updated: 'Время последней модификации', // datetime
		folders: 'Список папок, в которые попадает задача', // array
		tags: 'Тэги, привязанные к задаче', // array<object (Id, Name)>
		activity: 'Дата и время последней активности по задаче', // datetime
		actions: 'Список доступных действий над задачей', // array
		is_overdue: 'Является ли задача просроченной', // bool
		comments_unread: 'Количество непрочитанных комментариев' // integer
	},

	task_fields: {
		id: 'идентификатор',
		name: 'наименование',
		activity: 'активность',
		deadline: 'дата дедлайна',
		responsible: 'ответственный',
		owner: 'постановщик',
		contractor: 'заказчик',
		start: 'старт',
		planned_finish: 'плановый финиш',
		planned_work: 'запланировано',
		actual_work: 'отработано',
		completed: 'процент завершения',
		bonus: 'бонус',
		fine: 'штраф',
		planned_time: 'длительность'
	},

	project_fields_full: {
		id: 'ID проекта', // integer
		name: 'Название', // string
		status: 'Статус', // string
		deadline: 'Дедлайн', // datetime
		owner: 'Владелец (сотрудник)', // object (Id, Name)
		responsible: 'Менеджер (сотрудник)', // object (Id, Name)
		severity: 'Важность', // object (Id, Name)
		super_project: 'Надпроект', // object (Id, Name)
		favorite: 'В избранном', // integer
		time_created: 'Время создания', // datetime
		time_updated: 'Время последней модификации', // datetime
		tags: 'Тэги, привязанные к проекту', // array<object (Id, Name)>
		start: 'Старт проекта', // datetime
		activity: 'Дата и время последней активности по проекту', // datetime
		actions: 'Список допустимых действий над проектом', // array
		is_overdue: 'Является ли проект просроченным', // bool
	},

	employee_fields_full: {
		id: 'ID сотрудника', // integer
		name: 'Полное имя', // string
		last_name: 'Фамилия', // string
		first_name: 'Имя', // string
		middle_name: 'Отчество', // string
		position: 'Должность', // object (Id, Name)
		department: 'Отдел', // object (Id, Name)
		phones: 'Телефоны', // array
		email: 'E-mail', // string
		status: 'Статус', // object (Id, Name)
		time_created: 'Время создания', // datetime
		fire_day: 'Дата увольнения', // date
		avatar: 'Адрес аватара сотрудника	', // string
		login: 'Логин сотрудника', // string
	},

	department_fields_full: {
		id: 'ID отдела', // integer
		name: 'Название отдела', // string
		head: 'Начальник отдела', // object (Id, Name)
		employees: 'Список сотрудников отдела', // array<object (Id, Name)>
		employees_count: 'Количество сотрудников в отделе', // integer
	},

	todolist_fields_full: {
		id: 'Id списка дел', // integer
		name: 'Название списка дел', // string
		todo_count: 'Количество незавершенных дел в списке', // integer
	},

	event_fields_full: {
		id: 'Id события', // integer
		description: 'Описание события', // string
		name: 'Название события', // string
		time_created: 'Дата и время создания', // datetime
		start_time: 'Начало события', // datetime
		duration: 'Продолжительность события', // integer
		is_personal: 'Личное дело?', // boolean
		event_category: 'Категория события', // string
		participants: 'Список участников', // object (Id, Name)
		contractors: 'Список контрагентов', // object (Id, Name)
		reminders: ' Напоминания', // object (Transport, TimeBefore)
		has_todo: 'Имеет дела?', // boolean
		has_communication: 'Имеет коммуникации?', // boolean
		todo_list_id: 'Код списка дел, в котором находится событие', // integer
		position: 'Порядковый номер события внутри списка дел', // integer
		owner: 'Id пользователя, создавшего событие', // integer
		is_finished: 'Является ли событие завершенным', // boolean
		place: 'Место события', // string
		is_favorite: 'Добавлено ли событие в избранное', // bool
		time_updated: 'Время последней модификации события', // datetime
		can_edit: 'Можно ли редактировать событие', // bool
		is_overdue: 'Просрочено ли событие', // bool
	},

	event_place_fields_full: {
		id: 'Id места', // integer
		name: 'Название места', // string
	},

	event_category_fields_full: {
		id: 'Id категории', // integer
		name: 'Название категории', // string
	},

	comment_fields_full: {
		id: 'ID комментария', // integer
		text: 'Текст комментария', // string
		work: 'Кол-во потраченных минут, которое приплюсовано к комментируемому объекту (задаче или проекту)', // integer
		work_date: 'Дата, на которую списаны потраченные часы', // date
		time_created: 'Время создания', // datetime
		author: 'Автор комментария (сотрудник)', // object (Id, Name)
		avatar: 'Адрес аватара автора', // string
		attaches: 'Файлы, прикрепленные к комментарию', // object (Name, Url)
		is_unread: 'Является ли комментарий непрочитанным', // bool
		is_favorite: 'Находится ли комментарий в избранном', // bool
	},

	comment_oops: {
		first_unread_comment: 'ID первого непрочитанного комментария', // integer
	},

	notifications: {
		id: 'ID уведомления', // integer
		subject: 'Предмет уведомления (см. пояснение ниже)', // object(Id,Name,Type)
		content: 'Содержимое уведомления (см. пояснение ниже)', // string или object(Subject,Text,Author)
		time_created: 'Время создания уведомления', // datetime
	},

	contractor_fields_full: {
		id: 'Идентификатор клиента', // integer
		name: 'Имя клиента', // string
		birthday: 'Дата рождения', // datetime
		description: 'Описание клиента', // string
		email: 'E-mail', // string
		facebook: ' Facebook', // string
		jabber: 'Jabber', // string
		payers: 'Список плательщиков', // object (Id, Name)
		person_type: 'Тип клиента', // string
		prefer_transport: 'Предпочтительный способ связи', // string
		promising_rate: 'Перспективность', // string
		responsibles: '', // object (Id, Name)
		site: 'Сайт', // string
		time_created: 'Время создания', // datetime
		time_updated: 'Время обновления', // datetime
		twitter: 'Twitter', // string
		type: 'Тип', // string
	}
};
