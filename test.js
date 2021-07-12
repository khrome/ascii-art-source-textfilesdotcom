var should = require('chai').should();

var db = require('better-sqlite3')(':memory:');


var source = require('./source');

db.exec("CREATE TABLE textfilesKVS (key TEXT, value TEXT)");
describe('textfiles.com', function(){
    describe('can list', function(){
        it('all contents + caches correctly', function(done){
            this.timeout(20000);
            var counts = {
                hits : 0,
                misses : 0
            }
            source.cache = {
                get : function(key, cb){
                    var row = db.prepare("SELECT * FROM textfilesKVS WHERE key = ?").get(key);
                    if(!row) counts.misses++;
                    else counts.hits++;
                    setTimeout(function(){
                        cb(undefined, row && row.value);
                    }, 0);
                },
                set : function(key, value, cb){
                    db.prepare("INSERT INTO textfilesKVS VALUES (?, ?)").run(key, value);
                    setTimeout(function(){
                        cb(undefined);
                    }, 0);
                }
            };
            source.list(function(err1, structured1, list1){
                var counts1 = JSON.parse(JSON.stringify(counts));
                should.not.exist(err1);
                should.exist(list1);
                should.exist(structured1);
                source.list(function(err2, structured2, list2){
                    var counts2 = JSON.parse(JSON.stringify(counts));
                    should.not.exist(err2);
                    should.exist(list2);
                    should.exist(structured2);
                    list1.should.deep.equal(list2)
                    structured1.should.deep.equal(structured2);
                    done();
                });
            });
        });
    });

    describe('can list', function(){
        it('searches', function(done){
            this.timeout(20000);
            source.search('fairlight', function(err, results){
                should.not.exist(err);
                should.exist(results);
                results.length.should.equal(46);
                done();
            });
        })
    });

    describe('can fetch', function(){
        it('fetches', function(done){
            source.fetch('FAIRLIGHT', 'elitetrn.nfo', function(err, results){
                should.not.exist(err);
                should.exist(results);
                (typeof results).should.equal('string');
                done();
            });
        })
    });
});
