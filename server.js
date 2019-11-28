const express = require('express')
const app = express()
const server = require('http').createServer(app)
//httpサーバーの作成
//const server = createServer(app)でもサーバーは作成できるが、expressのサーバーを動かすとなると多くのmoduleが必要になる。
//httpだけであれば必要最低限の構成でサーバーを起動できる

const portNumber = 3005
//番号はなんでも良いが、他で使用している番号と重ならないように注意

const isProd = process.env.NODE_ENV === 'production'

// app.set('view engine', 'pug')
server.listen(portNumber, () => {
    console.log('起動しました', 'http://localhost' + portNumber)
})
//サーバーの起動時、端末にポート番号を表示する。
//そうすることで、コピー＆ペーストによって簡単にブラウザからチャットに接続できる。

app.use('/', express.static('./build'))
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});
//クライアントにアクセスさせたい情報をapp.useに格納している
// app.get('/',(req,res) => {
//     res.redirect(302, '/')
// })
//クライアントからの要求があったときに一時的にpublicの内容を渡す

const socketio = require('socket.io')
const io = socketio.listen(server)
let store = {};

// io.on('connection',(socket) => {
//
//     socket.on('roomConnect',(rooms) => {
//         console.log('Acces to User:', rooms)
//         //会話相手を選択したときの処理
//         rooms.forEach(function(room) {
//             console.log("room:" + room.room_id)
//             socket.join(room.room_id);
//         });
//     });
//
//     socket.on('chatMessage',(msg) => {
//         //メッセージ受信時の処理
//         let usrobj = {
//             'user_id': msg.user_id,
//             'room': msg.room_id,
//             'name': msg.name
//         };
//         console.log(msg.id)
//         // socket.join(msg.room_id);
//         store[msg.id] = usrobj;
//         io.to(store[msg.id].room).emit('receiveMessage',msg)
//     });
//
//     // socket.on('disconnect',(room)=> {
//     //     console.log("disconnect")
//     // });
//
// });


let userHash = {};
let chatNS = io.of('/chat');
chatNS.on("connection", function(socket){
    let room = socket.handshake.query.room;
    console.log("/chat/ connection:" + room)
    // Room(Namespacesで分けた時、roomも利用した方が良いみたい)
    let roomName = "default";

    // WebSocketで接続の際にどのroomに参加するか？
    socket.join(roomName);

    // 接続開始のカスタムイベント(接続元ユーザを保存し、他ユーザへ通知)
    socket.on("connected", function(name){
        let msg = name + "が入室しました";
        userHash[socket.id] = name;
        chatNS.to(roomName).emit("pushlish", {value: msg});
    });

    // メッセージ送信カスタムイベント
    socket.on("publish", function(data){
        chatNS.to(roomName).emit("publish", {value:data.value});
    });

    let nowTyping = 0;
    socket.on("start typing", function(){
        if (nowTyping <= 0) {
            socket.to(roomName).emit("start typing", userHash[socket.id]);
        }

        nowTyping++;
        setTimeout(function(){
            nowTyping--;
            if (nowTyping <= 0) {
                socket.to(roomName).emit("stop typing");
            }
        }, 3000);
    });

    socket.on("stop typing", function(){
        nowTyping = 0;
        socket.broadcast.emit("stop typing");
    });

    // 接続終了組み込みイベント(接続元ユーザを削除し、他ユーザへ通知)
    socket.on("disconnect", function(){
        if(userHash[socket.id]){
            let msg = userHash[socket.id] + "が退出しました";
            delete userHash[socket.id];
            chatNS.to(roomName).emit("receiveMessage", msg);
        }
    });
    socket.on('roomConnect',(rooms) => {
        console.log('Acces to User:', rooms)
        //会話相手を選択したときの処理
        rooms.forEach(function(room) {
            console.log("room:" + room.room_id)
            socket.join(room.room_id);
        });
    });

    socket.on('chatMessage',(msg) => {
        //メッセージ受信時の処理
        console.log("msg:"+msg.user_id)
        let usrobj = {
            'user_id': msg.user_id,
            'room_id': msg.room_id,
            'name': msg.name
        };
        // socket.join(msg.room_id);
        store[msg.id] = usrobj;
        console.log(msg)
        chatNS.to(store[msg.id].room_id).emit('receiveMessage',msg)
    });
})
// console.log(isProd)
// if (!isProd) {
//     const webpack = require('webpack')
//     const webpackConfig = require('./webpack.config.js')
//     const compiler = webpack(webpackConfig)
//     app.use(require('webpack-dev-middleware')(compiler, {
//         noInfo: true, publicPath: webpackConfig.output.publicPath
//     }))
//     app.use(require("webpack-hot-middleware")(compiler))
// }

