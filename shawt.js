var levelup = require("levelup"),
    q = require("q"),
    server = new (require("./modules/server.js"));

server.do(function(req, res, next){
    var def = q.defer();
    levelup(__dirname + '/db', function(err, db) {
        if(err) {
            def.reject(err);
        } else {
            req.db = db;
            def.resolve(next());
        }
    });
    return def.promise;
});

server.do(require("./modules/bodyparser.js"));

server.do(function doApi(req, res, next) {
    console.log(req.urlParts);
    if(req.urlParts[0] === 'api') {
        if(req.method === 'POST') {
            if(req.body.link) {
                var timestamp = new Date()
                                .getTime()
                                .toString()
                                .split("")
                                .map(function(e){
                                    return new Number(e);
                                })
                                .map(function(e, i, a){
                                    return String.fromCharCode(65 + e + a[Math.min(a.length-1, i+1)])
                                })
                                .reduce(function(p, c){return p + c}, ""),
                    def = q.defer();
                req.db.put(timestamp, req.body.link, function(err) {
                    if(err) {
                        def.reject(err);
                    } else {
                        res.json(200, {code: 200, link: timestamp});
                        def.resolve(next());
                    }
                });
                return def.promise;
            }
            res.json(400, {code: 400, message: "Bad request; missing link"});
        } else {
            res.setHeaders({"Allow": "POST"});
            res.json(405, {code: 405, message: "Method not supported; send post message"});
        }
    }
});

server.do(function doLink(req, res, next) {
    if(req.method === 'GET') {
        if(req.urlParts[0].length === 13){
            var def = q.defer();
            req.db.get(req.urlParts[0], function(err, url) {
                if(err) {
                    def.reject(err);
                } else {
                    if(url){
                        res.send(302, null, {'Location': url});
                    } else {
                        res.json(404, {code: 404, message: "No link for code " + req.urlParts});
                    }

                    def.resolve(next());
                }
            });
            return def.promise;
        } else {
            res.json(404, {code: 404, message: "No link for code " + req.urlParts});
        }
    }
});

server.listen();
