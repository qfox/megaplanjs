Megaplan client module for NodeJS
---------------------------------

A NodeJS library to work with megaplan.ru API

Provides a class that implements Megaplan authentication and request signing.
Only supports POST requests. The complete API documentation is at:
https://help.megaplan.ru/API

At first you need to install library

```sh
npm install megaplanjs --save
```

You can generate documentaion with commands:

```sh
npm install
npm run docs
```

Authorization
=============

To authorize using a password:

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

To authorize using tokens:

```js
var megaplan = require ('megaplanjs');
var client = new megaplan.Client('xyz.megaplan.ru', access_id, secret_key);
client.tasks().send(function (tasks) {
    console.log(tasks); // still a lot of results
}, function (err) {
    console.log(err);
});
```

To authorize using one-time-key:

```js
var megaplan = require ('megaplanjs');
var client = new megaplan.Client('xyz.megaplan.ru').auth('', '', '4gih4y4gih4yH77QebicH77Qebic');
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
