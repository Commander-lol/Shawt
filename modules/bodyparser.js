/*jslint node:true */
'use strict';
var formidable = require("formidable"),
    q = require("q"),
    bodyparser = function (req, res, next) {
        var core = q.defer(),
            form;

        req.body = {};
        req.query = require('url').parse(req.url, true).query;
//        req.files = {};

        req.url = req.url.split("?")[0];

        form = new formidable.IncomingForm();
        form.on('field', function (name, value) {
            req.body[name] = value;
        });
        form.on('end', function () {
            core.resolve(next());
        });
        form.on('error', function (err) {
            core.reject(err);
        });
        form.parse(req);

        return core.promise;
    };

module.exports = bodyparser;
