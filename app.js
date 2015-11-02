var http = require('http');
var url = require('url');
var mongojs = require('mongojs')
var redis = require('redis');
var crypto = require('crypto');
var fs = require('fs');

var client = redis.createClient();
var sessionstore = "ses";
var dbname = "notesdb";
var collections = [ "notes" ];
var db = mongojs(dbname, collections);

http.createServer(function(req, res) {
	var uu = url.parse(req.url, true);
	if(uu.pathname == "/startSession") {
		res.writeHead(200, { "Content-Type" : "text/html"});
		var dte = new Date().toString();
		var key = crypto.createHash('md5').update(dte).digest("hex");
		client.sadd(sessionstore, key);
		res.write("<html><body style='padding:10px;'>");
		res.write("<div style='border-radius: 30px; background-color:#99cc66; padding: 40px; width:50% !important;'>Session started. Key is: " + key + ". Please save this key.</div>");
		res.write("</body></html>");
		res.end();
	}
	else if(uu.pathname == "/endSession") {
		if(!uu.query.key) {
			writeErrorMsg(res);
		}
		else {
			client.sismember(sessionstore, uu.query.key, function(err, set) {
				if(set == 1) {
					db.notes.remove({"session" : uu.query.key}, function(err, docs) {
						client.srem(sessionstore, uu.query.key);
						res.writeHead(200, { "Content-Type" : "text/html"});
						res.write("<html><body style='padding:10px;'>");
						res.write("<div style='border-radius: 30px; background-color:#99cc66; padding: 40px; width:50% !important;'>Session " + uu.query.key + " has ended. Notes deleted.</div>");
						res.write("</body></html>");
						res.end();
					});
				}
				else {
					writeErrorMsg(res);
				}
			});
		}
	}
	else if(uu.pathname == "/listNotes") {
		if(!uu.query.session) {
			writeErrorMsg(res);
		}
		else {
			client.sismember(sessionstore, uu.query.session, function(err, set) {
				if(set == 1) {
					db.notes.find({"session" : uu.query.session}, function(er, docs) {
						res.writeHead(200, { "Content-Type" : "text/html"});
						res.write("<html><body style='padding:10px;'>");
						res.write("<div style='border-radius: 30px; background-color:#99cc66; padding: 40px; width:50% !important;'>");
						docs.forEach(function(doc) {
							res.write("<div style='border-radius: 20px; background-color:#fff; padding: 30px; margin: 10px 0;");
							res.write("<strong>ID: </strong>" + doc._id + "<br />");
							res.write("<strong>Session Key: </strong>" + doc.session + "<br />");
							res.write("<strong>Title: </strong>" + doc.title + "<br />");
							res.write("<strong>Content: </strong>" + doc.content + "<br />");
							res.write("</div>");
						});
						res.write("</div></body></html>");
						res.end();
					});
				}
				else {
					writeErrorMsg(res);
				}
			});
		}
	}
	else if(uu.pathname == "/getNote") {
		if(!uu.query.session) {
			writeErrorMsg(res);
		}
		else {
			client.sismember(sessionstore, uu.query.session, function(err, set) {
				if(set == 1) {
					if(mongojs.ObjectId.isValid(uu.query.id)) {
						db.notes.findOne({"session" : uu.query.session, "_id" : mongojs.ObjectId(uu.query.id)}, function(err, docs) {
							res.writeHead(200, { "Content-Type" : "text/html"});
							res.write("<html><body style='padding:10px;'>");
							res.write("<div style='border-radius: 30px; background-color:#99cc66; padding: 40px; width:50% !important;'>");
							res.write("<strong>ID: </strong>" + docs._id + "<br />");
							res.write("<strong>Session Key: </strong>" + docs.session + "<br />");
							res.write("<strong>Title: </strong>" + docs.title + "<br />");
							res.write("<strong>Content: </strong>" + docs.content + "<br />");
							res.write("</div></body></html>");
							res.end();
						});
					}
					else {
						writeErrorMsg(res);
					}
				}
				else {
					writeErrorMsg(res);
				}
			});
		}
	}
	else if(uu.pathname == "/saveNote") {
		if(Object.keys(uu.query).length < 3) {
			writeErrorMsg(res);
		}
		else {
			client.sismember(sessionstore, uu.query.session, function(err, set) {
				if(set == 1) {
					db.notes.insert({"session" : uu.query.session,
				                     "title"   : uu.query.title,
				                     "content" : uu.query.content});
					res.writeHead(200, { "Content-Type" : "text/html"});
					res.write("<html><body style='padding:10px;'>");
					res.write("<div style='border-radius: 30px; background-color:#99cc66; padding: 40px; width:50% !important;'>Note successfully created.</div>");
					res.write("</body></html>");
					res.end();
				}
				else {
					writeErrorMsg(res);
				}
			});
		}
	}
	else if(uu.pathname == "/noteform") {
		res.writeHead(200, { "Content-Type" : "text/html"});
		var fileStream = fs.createReadStream('form.html');
		fileStream.pipe(res);
	}
	else {
		writeErrorMsg(res);
	}
}).listen(8001);



function writeErrorMsg(res) {
	res.writeHead(200, { "Content-Type" : "text/html"});
	res.write("<html><body style='padding:10px;'>");
	res.write("<div style='border-radius: 30px; background-color:#99cc66; padding: 40px; width:50% !important;'>");
	res.write("URL parameters is insufficient or invalid input!");
	res.write("</div></body></html>");
	res.end();
}

