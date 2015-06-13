var http = require("http"),
    q = require("q");
    Server = function () {
        var that = this, p;
        that.funcList = [];

        that.do = function(fn) {
            that.funcList.push(fn);
        };

        that.mkReq = function(req) {
            req.ip = req.headers['x-forwarded-for'] ||
                     req.connection.remoteAddress ||
                     req.socket.remoteAddress ||
                     req.connection.socket.remoteAddress;
            req.urlParts = req.url.split("/");
            req.urlParts.shift();
            return req;
        };

        that.mkRes = function(res) {
            res.headers = {};
            res.finished = false;
            res.setHeaders = function setHeaders(headers) {
                var p;
                for(p in headers){
                    if(headers.hasOwnProperty(p)){
                        res.headers[p] = headers[p];
                    }
                }
            }

            res.finish = function finish(){
                res.end();
                res.finished = true;
            };

            res.json = function json(code, obj) {
                res.send(code, JSON.stringify(obj), {'Content-Type': 'application/json'});
            }

            res.send = function send(code, data, headers) {
                var h = res.headers,
                    p;
                for(p in headers){
                    if(headers.hasOwnProperty(p)){
                        h[p] = headers[p];
                    }
                }
                if(!h.hasOwnProperty('Content-Type')){
                    h['Content-Type'] = 'text/plain';
                }
                res.writeHead(code, h);
                if(data !== null) res.write(data);
                res.finish();
            };
            return res;
        };

        that.listen = function listen(port){
            that.server = http.createServer(function (req, res){
                var reqx = that.mkReq(req),
                    resx = that.mkRes(res),
                    wrapfunc = function(fn, req, res) {
                        var core = q.defer(),
                            promiseConstructor = q.resolve(1).constructor,
                            result,
                            next = function(){
                                core.resolve([req, res]);
                                return [req, res];
                            };

                        if(res.finished) {
                            next();
                        } else {
                            result = fn(req, res, next);
                            if(typeof (result) === 'object' && result.constructor === promiseConstructor) {
                                core.resolve(result);
                            } else {
                                next();
                            }
                        }
                        return core.promise;
                    };

                resx.on("finish", function closeDB(){
                    if(reqx.db){
                        reqx.db.close();
                    }
                });

                that.funcList.reduce(function(chain, fn) {
                    return chain.spread(wrapfunc.bind(fn, fn));
                }, q([reqx, resx])).done(function ensureEnd(rqrs) {
                    if (!resx.finished) {
                        resx.finish();
                    }
                });
            }).listen(port || 7890);

            console.log("Shawt listening on port " + (port || 7890));
            return that.server;
        }
    };

module.exports = Server;
