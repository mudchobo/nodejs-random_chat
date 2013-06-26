var app = require('http').createServer(handler),
    io = require('socket.io').listen(app),
    fs = require('fs');
    
app.listen(process.env.PORT || 9000);

function handler(req, res){
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
            if (err) {
                res.writeHead(500);
                return res.end('Error loading index.html');
            }
            res.writeHead(200);
            data = data.toString('utf-8').replace('<%=host%>', req.headers.host);
            res.end(data);
        }
    );
};
var socketRoom = {};
io.set('log level', 2);
io.sockets.on('connection', function(socket){
    // 접속완료를 알림.
    socket.emit('connected');
    
    // chat요청을 할 시
    socket.on('requestRandomChat', function(data){
        // 빈방이 있는지 확인
        console.log('requestRandomChat');
        var rooms = io.sockets.manager.rooms;
        for (var key in rooms){
            if (key == ''){
                continue;
            }
            // 혼자있으면 입장
            if (rooms[key].length == 1){
                var roomKey = key.replace('/', '');
                socket.join(roomKey);
                io.sockets.in(roomKey).emit('completeMatch', {});
                socketRoom[socket.id] = roomKey;
                return;
            }
        }
        // 빈방이 없으면 혼자 방만들고 기다림.
        socket.join(socket.id);
        socketRoom[socket.id] = socket.id;
    });
    
    // 요청 취소 시
    socket.on('cancelRequest', function(data){
        socket.leave(socketRoom[socket.id]);
    });
    
    // client -> server Message전송 시
    socket.on('sendMessage', function(data){
        console.log('sendMessage!');
        io.sockets.in(socketRoom[socket.id]).emit('receiveMessage', data);
    });
    
    // disconnect
    socket.on('disconnect', function(data){
        var key = socketRoom[socket.id];
        socket.leave(key);
        io.sockets.in(key).emit('disconnect');
        var clients = io.sockets.clients(key);
        for (var i = 0; i < clients.length; i++){
            clients[i].leave(key);
        }
    });
});
