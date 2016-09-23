// ===================================
// `tail -f` in Node.js and WebSockets
// ===================================
//
// Usage:
// 
//
// Connect with browser and watch changes in the logfile
//
//
var http    = require('http'),
    fs      = require('fs');

var spawn = require('child_process').spawn;

// -- Node.js Server ----------------------------------------------------------

server = http.createServer(function(req, res){
  // use to debug this script without nginx
  var filePath = './webroot/' + req.url;
  fs.readFile(filePath, function(error, content) {
    if (error) {
      res.writeHead(403, {'Content-Type': 'text/html'})
      res.write("<h1>Forbidden</h1>");
      res.end();
    } else {
      res.writeHead(200);
      res.end(content, 'utf-8');
    }
  });
})
server.listen(8228, '127.0.0.1');

// -- Setup Socket.IO ---------------------------------------------------------

var io = require('socket.io')(server, {path: '/tailflog.ws'});

io.on('connection', function(client) {
  console.log((new Date()).toString(), 'client', client.conn.remoteAddress, 'connected.');
  var tail = null;

  client.on('disconnect', function() {
    console.log((new Date()).toString(), 'client', client.conn.remoteAddress, 'disconnected.');
    if (tail != null) {
      tail.kill();
      tail = null;
    }
  });

  client.on('message', function(msg) {
    if (msg.logfile) {
      if (tail != null) {
        tail.kill();
        tail = null;
      }
      fs.access(msg.logfile, fs.R_OK, function(err) {
        if (err) {
          client.send( { tail: "Can not access file " + msg.logfile } );
          tail = null;
        } else {
          tail = spawn("tail", ["-f", msg.logfile]);
          client.send( { logfile : msg.logfile } );

          tail.stdout.on('data', function(data) {
            client.send( { tail : data.toString('utf-8') } );
          }); 
        }
      });
    }
  });

});

