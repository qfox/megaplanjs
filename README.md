Megaplan client module for NodeJS
---------------------------------

A NodeJS library to work with megaplan.ru API

Provides a class that implements Megaplan authentication and request signing.
Only supports POST requests. The complete API documentation is at:
http://wiki.megaplan.ru/API

Authorization
=============

To use a password:

```js
var megaplan = require ('megaplanjs');
var client = megaplan.Client('xyz.megaplan.ru');
[access_id, secret_key] = client.authenticate(login, password);
```

To use tokens:

```js
var megaplan = require ('megaplanjs');
# access_id, secret_key = c.authenticate(login, password)
var client = megaplan.Client('xyz.megaplan.ru', access_id, secret_key);
```

Data requests
=============

To list actual tasks:

```js
var res = client.taskList({ status: 'actual' });
for (var k in res.tasks) {
    var task = res.tasks[k];
    console.log(k, task);
}
```


Copylefts
=========

Code originally written by Alexej Yaroshevich <zxqfox@gmail.com> under the MIT License.

Enjoy!
