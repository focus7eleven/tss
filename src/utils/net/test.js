let socket = require('engine.io-client')('ws://192.168.1.120:7091');
let protobuf = require('protobufjs');
let Constants = require("./constants/constants");
let builder = protobuf.loadProtoFile("./proto/c2c.proto");
let	Msg = builder.build("c2c");
socket.binaryType = 'arraybuffer';
var userId = 1179;

/* from zp */
var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');
var possibleLength = possible.length;

var longToString = function (n) {
	var text = "";
	var a;
	if(n==0){
		return 'A';
	}
	while (n>0) {
		a = n%possibleLength;
		n = parseInt(n/possibleLength);
		text += possible[a];
	}
	return text;
};
function generateRequestId(userId) {
	return longToString(userId)+"$"+ longToString(new Date().getTime());

}

socket.on('open', function () {
	var params = {userId:userId,agent:"Web"};
	const requestId = generateRequestId(userId);
	let sign = new Msg({type:Constants.DATA_TYPE.SIGN_IN,params:JSON.stringify(params),requestId:requestId});
	socket.send(sign.encode().toBuffer());

	let timer = setInterval(() => {
		let chat = {
			type: Constants.MESSAGE_TYPE.AFFAIR_CHAT,
			frUid: 1179,
			toUid: 1166,
			rid: 3232,
			aid: 4305,
			toRid: 2455,
			frRid: 2467,
			sub: 0,
			name: 'test',
			content: new Date().toLocaleTimeString()
		};
		let msg = new Msg({type: Constants.DATA_TYPE.MSG, chat: chat, requestId: generateRequestId(userId)});
		socket.send(msg.encode().toBuffer());
	}, 5000)

	socket.on('message', function(data){
		let c2c = Msg.decode(data);
		switch (c2c.type){
			case Constants.DATA_TYPE.REDIRECT:
				socket.close();
				// init("http://"+c2c.data);
				break;
			case Constants.DATA_TYPE.MSG:
				break;
			case Constants.DATA_TYPE.RESPONSE:
				// console.log('=============response=============');
				// console.log(c2c);
				break;
			case Constants.DATA_TYPE.BUMPED:
				break;

			case Constants.DATA_TYPE.ERROR:
				break;
			case Constants.DATA_TYPE.NEW_LOGIN:
			default:
				break
		}
	});
	socket.on('close', function(){
	});
	socket.on('ping',function (a) {
	});
	socket.on('pong',function (b) {
	});
});
