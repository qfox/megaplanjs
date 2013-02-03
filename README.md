Megaplan client module for NodeJS
---------------------------------

A NodeJS library to work with megaplan.ru API

Provides a class that implements Megaplan authentication and request signing.
Only supports POST requests. The complete API documentation is at:
http://wiki.megaplan.ru/API

At first you need to install library
```sh
npm install -l megaplanjs
```

Authorization
=============

To auth using a password:
```js
var megaplan = require ('megaplanjs');
var client = new megaplan.Client('my.megaplan.ru').auth('me', 'pass');
client.on('auth', function (res, err) {
    // store res.access_id, res.secret_key if you need these (see below)
    console.log('authenticated', res, err);

    client.tasks().send(function (tasks) {
        console.log(tasks); // a lot of results
    }, function (err) {
        console.log(err);
    });
});
```

To use tokens:
```js
var megaplan = require ('megaplanjs');
var client = megaplan.Client('xyz.megaplan.ru', access_id, secret_key);
client.tasks().send(function (tasks) {
    console.log(tasks); // still a lot of results
}, function (err) {
    console.log(err);
});
```

Data requests
=============

Look `index.js` for information. It's pretty simple to use


Copylefts
=========

Code originally written by Alexej Yaroshevich <zxqfox@gmail.com> under the MIT License.

Enjoy!
