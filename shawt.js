var http = require("http"),
    jwt = require("jsonwebtoken"),
    q = require("q"),
    qs = require("querystring"),
    level = require("level"),
    formidable = require("formidable"),
    conf = require("./config.js"),
    fs = require("fs"),
    path = require("path"),
    url = require("url"),
    Hash = require("hashids"),
    hash = new Hash(conf.salt, conf.minSlugLength, conf.alphabet),
    server = http.createServer(),
    db,
    dbput,
    dbget,
    fsstat,
    doServerSetup,
    doRequestHandler,
    slugIndex;

dbput = function (key, value) {
    var def = q.defer();
    db.put(key, value, function(err) {
        if (err) {
            def.reject(err);
        } else {
            def.resolve(true);
        }
    });
    return def.promise;
}

dbget = function (key) {
    var def = q.defer();
    db.get(key, function(err, val) {
        if(err) {
            def.reject(err);
        } else {
            def.resolve(val);
        }
    });
    return def.promise;
}

fsstat = function (path) {
    var def = q.defer();
    fs.stat(path, function(err, stat) {
        if(err) {
            def.reject(err);
        } else {
            def.resolve(stat);
        }
    });
    return def.promise;
}

doServerSetup = function() {
    var def = q.defer();
    db = new level(conf.dbPath);
    dbget("conf::index")
    .then(function(val){
        slugIndex = parseInt(val, 10);
        def.resolve(true);
    },
    function(err){
        if (/NotFoundError/.test(err)) {
            slugIndex = 1;
            dbput(slugIndex)
            .then(function() {
                def.resolve(true);
            })
        } else {
            def.reject(err);
        }
    });
    return def.promise;
}

doRequestHandler = function(req, res) {
    var match,
        def = q.defer(),
        file,
        fpath,
        body;

    switch(req.method) {
        case "GET":
            if(req.url == "/") {
                req.url = "/files/index.html";
            }
            if((match = /\/files\/(.+)/.exec(req.url)) != null) {
                fpath = path.join(__dirname, "public", match[1]);
                fsstat(fpath)
                .then(function(stat){
                    file = fs.createReadStream(fpath);
                    file.on("end", function() {
                        def.resolve(true);
                    });
                    res.writeHead(200, {
                        "Content-Length": stat.size
                    });
                    file.pipe(res);
                },
                function(err){
                    if(/ENOENT/.test(err.code)) {
                        res.writeHead(404, "File Not Found");
                        def.resolve(false);
                    } else {
                        def.reject(err);
                    }
                });
            } else {
                match = /\/(.+)/.exec(req.url)[1];
                dbget(match)
                .then(function(target){
                    res.statusCode = 301;
                    res.setHeader("Location", target);
                    def.resolve(true);
                },
                function(err){
                    if(/NotFoundError/.test(err)) {
                        res.writeHead(404, "Slug Not Found");
                        def.resolve(true);
                    } else {
                        def.reject(err);
                    }
                });
            }
            break;

        case "POST":
            if(req.url == "/") {
                body = new formidable.IncomingForm();
                body.parse(req, function(err, fields) {
                    if(err) {
                        def.reject(err);
                    } else {
                        if(fields.url) {
                            var ident = hash.encode(++slugIndex);
                            if(url.parse(fields.url).protocol == null) {
                                fields.url = "http://" + fields.url;
                            }
                            dbput("conf::index", slugIndex)
                            .then(dbput(ident, fields.url))
                            .done(function() {
                                res.writeHead(200, {"Content-Type": "text/plain"});
                                res.write(ident);
                                def.resolve(true);
                            });
                        } else {
                            res.writeHead(400, "Bad Request");
                            def.resolve(false);
                        }
                    }
                });
            }
            break;

        default:
            res.writeHead(403, "Unsupported Method");
            def.resolve(false);
            break;
    }

    def.promise
    .catch(function(err) {
        res.writeHead(500, "Internal Server Error", {"Content-Type": "text/plain"});
        if(process.env == "production") {
            res.write("Oops!");
        } else {
            res.write(err);
        }
    })
    .done(function() {
        res.end();
    });
}

doServerSetup().done(function(){
    server.on("request", doRequestHandler);
    server.listen(conf.port);
})
