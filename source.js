(function (root, factory){
    if(typeof define === 'function' && define.amd){
        // AMD. Register as an anonymous module.
        define([
            'ascii-art/art-source',
            'async/mapSeries',
            'cheerio',
            'minisearch',
            'uuid'
        ], factory);
    }else if (typeof module === 'object' && module.exports){
        module.exports = factory(
            require('ascii-art/art-source'),
            require('async/mapSeries'),
            require('cheerio'),
            require('minisearch'),
            require('uuid')
        );
    }else{
        // Browser globals (root is window)
        root.AsciiArtSourceTextFilesDotCom = factory(
            root.AsciiArtSource,
            root.async.mapSeries,
            root.cheerio,
            root.MiniSearch,
            root.uuid
        );
    }
}(this, function(ArtSource, map, cheerio, MiniSearch, uuid){
    var request = function(){
        throw new Error('request not set!');
    }
    var contexts = {
        NFO : {post:'piracy/'},
        asciiart : {pre: 'artscene.'},
        LOGOS : {post: 'art/'},
        ASCIIPR0N : {post: 'art/'},
        RTTY : {post: 'art/'},
        DECUS : {post: 'art/'},
        RAZOR : {post:'piracy/'},
        FAIRLIGHT : {post:'piracy/'},
        DREAMTEAM : {post:'piracy/'},
        HUMBLE : {post:'piracy/'},
        HYBRID : {post:'piracy/'},
        PRESTIGE : {post:'piracy/'},
        INC : {post:'piracy/'},
        TDUJAM : {post:'piracy/'},
        ANSI : {post: 'piracy/'},

    }
    var urlFor = function(pathName, fileName){
        var context = contexts[pathName];
        var url = 'http://'+(
                context.pre  || ''
            )+'textfiles.com/'+(
                context.post || ''
            )+pathName+'/'+(
                fileName     || ''
            );
        return url;
    }
    var cachedRemote = {};
    cachedRemote.fetch = function(source, url, handler, cb){
        var directFetch = function(url, callback){
            request(url, function(err, res, body){
                if(err) return callback(err);
                var data = body ||
                    (
                        res && res.request &&
                        res.request.responseContent &&
                        res.request.responseContent.body
                    ) || undefined;
                callback(undefined, data);
            });
        }
        if(source.cache){
            source.cache.get(url, function(err, val){
                if(val) return cb(undefined, JSON.parse(val));
                directFetch(url, function(err, body){
                    if(err) return cb(err);
                    try{
                        var data = handler(body);
                        var dataString = JSON.stringify(data);
                        source.cache.set(url, dataString, function(err){
                            cb(undefined, data);
                        });
                    }catch(ex){ cb(ex); }
                });
            });
        }else{
            directFetch(url, function(err, res, body){
                try{
                    var data = handler(body);
                    source.cache.set(url, JSON.stringify(data), function(err){
                        cb(undefined, data);
                    });
                }catch(ex){ cb(ex); }
            });
        }
    }
    var source = ArtSource.define({
        name:'textfiles.com',
        search : function(query, cb){
            source.list(function(err, structured, list){
                if(err) return cb(err);
                var miniSearch = new MiniSearch({
                  fields: ['file', 'description', 'path'], // fields to index for full-text search
                  storeFields: ['file', 'description', 'path'] // fields to return with search results
                });
                list.forEach(function(item){
                    if(!item.id) item.id = uuid.v4();
                });
                miniSearch.addAll(list);
                setTimeout(function(){
                    var results = miniSearch.search(query);
                    cb(undefined, results);
                }, 0);
            });
        },
        useRequest : function(instance){
            request = instance;
        },
        list : function(callback){
            var segmentedList = {};
            var list = [];
            return map(Object.keys(contexts), function(pathName, done){
                var url = urlFor(pathName);
                cachedRemote.fetch(source, url, function(body){
                    //if(err) return callback(err);
                    var $ = cheerio.load(body);
                    var results = $('tr').toArray().map(function(node, index){
                        var file = $('a[href]', node).text();
                        return {
                            file : file,
                            description : $($('td', node).toArray()[2]).text(),
                            path : pathName,
                            url : urlFor(pathName, file)
                        }
                    }).filter(function(item){
                        return item.name === '' || !item.name;
                    });
                    return results;
                }, function(err, results){
                    segmentedList[pathName] = results;
                    list = list.concat(results);
                    setTimeout(function(){
                        done(undefined, results);
                    }, 200);
                });
            }, function(err, allResults){
                callback(err, segmentedList, list);
            });
        },
        fetch : function(path, file, callback){
            if(!contexts[path]) return callback(new Error('Unknown Path'));
            var url = urlFor(path, file);
            request(url, function(err, res, body){
                if(err) return callback(err);
                var data = body ||
                    (
                        res && res.request &&
                        res.request.responseContent &&
                        res.request.responseContent.body
                    ) || undefined;
                callback(undefined, data);
            });
        },
    });
    return source;
}));
