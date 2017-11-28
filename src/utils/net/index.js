import {store} from "../../client";
import {pushGroupMessage, updateScroll, updateGroupUnreadCount} from "../../actions/message";
import Constants from './constants/constants';
import {Map, List} from "immutable";

let EngineIo = require('engine.io-client');
let socket;
let reconnect;

let proto = require('./proto/proto');
let protobuf = require('./lib/protobuf');
let parsedProto = protobuf.parse(proto.c2c);
protobuf.init({encoderProtos:parsedProto, decoderProtos:parsedProto});

let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split('');
const WEB_URL = 'https://www.menkor.cn'
let cachingRequests = Map();

let _numberHash = (n) => {
	let text = '';
	if(n==0){
		return 'A';
	}
	while (n>0) {
		text += possible[n%possible.length];
		n = parseInt(n/possible.length);
	}
	return text;
}

/**
 * 获得requestId
 * @param userId
 * @private
 */
let _generateRequestId = (userId) => _numberHash(userId) + '$' + _numberHash(new Date().getTime());

/**
 * 建立新的socket连接
 */
let socketInitPromise = null
export const socketInit = (userId, url = WEB_URL+':47041') => {
	try {
		socket = new EngineIo(url);
		socket.binaryType = 'arraybuffer';
		signIn(userId);

		socket.on('open', () => {
			if (reconnect) {
				clearInterval(reconnect);
			}

			socket.on('message', (data) => {
				let c2c;
				try {
					c2c = protobuf.decode('message c2c', data);
				} catch (e) {
					throw e
					return
				}
				switch (c2c.type) {
					case Constants.MSG_TYPE.REDIRECT:
						socket.close();
						// url = "w://" + c2c.data;
						url = `${WEB_URL}:4${c2c.data.split(':')[1]}`
						socketInit(userId, url);
						break;
					case Constants.MSG_TYPE.MSG:
						// receive chat message
						dealMessage(c2c.chat);
						break;
					case Constants.MSG_TYPE.RESPONSE:
						break;
					case Constants.MSG_TYPE.BUMPED:
						socket.close();
						break;
					case Constants.MSG_TYPE.SYSTEM:
						break;
					case Constants.MSG_TYPE.ERROR:
						break;
					case Constants.MSG_TYPE.NEW_LOGIN:
						break;
					case Constants.MSG_TYPE.PONG:
						break;
					default:
				}

				cachingRequests.get(c2c.requestId) && cachingRequests.get(c2c.requestId)(c2c);
				cachingRequests.delete(c2c.requestId);
			});
			socket.on('response', (data) => {})
			socket.on('close', (data) => {
				if (data != 'forced close') {
					//disconnected, 等待重连;手动close消息为forced close
					reconnect = setInterval(() => {
						socketInit(userId, url);
					}, 10000);
				}
			});
			socket.on('ping', function (data) {
			});
			socket.on('pong', function (data) {
			});
			socket.on('error', function (data) {
			});
		});
	} catch (error) {
		throw error
	}
}

/**
 * 登录socket
 * @param userId
 */
const signIn = (userId) => {
	socketInitPromise = new Promise((resolve) => {
		let requestId = _generateRequestId(userId);
		let signInfo = {
			type: Constants.MSG_TYPE.SIGN_IN,
			params: JSON.stringify({
				userId: userId,
				agent: 'Web',
				token: 'xxx'
			}),
			requestId: requestId
		}
		cachingRequests = cachingRequests.set(requestId, () => {
			resolve()
		})
		socket.send(protobuf.encode('message c2c', signInfo));
	})
}

const dealMessage = (message) => {
	switch (message.type) {
		case Constants.CHAT_TYPE.GROUP:
      const messages = store.getState().getIn(['message', 'group', message.rid, 'messages'], List());
			if (message.index != messages.get(messages.size -1, {index: -1}).index) {
				if (messages.size !== 0 && message.index === 0) {
					return;
				}
				pushGroupMessage(message, message.rid)(store.dispatch);
				updateScroll(message.rid, true)(store.dispatch);
				updateGroupUnreadCount(1, message.rid)(store.dispatch)
			}
			break;
		default:
	}
}

const formatChat = (chat) => {
	return {
    type: chat.type,
    sub: chat.sub,
    aid: chat.aid,
    rid: chat.rid,
    frRid: chat.frRid,
    frUid: chat.frUid,
    name: chat.name,
    content: chat.content,
	}
}

export const bindListener = () => {

}

/**
 * 发送消息
 * @param type, 消息类型, 使用Constants中的type
 * @param chat, 消息内容, 参考proto.js
 */
export const sendMessage = (type, chat, callback, params={}) => {
	socketInitPromise.then(() => {
		let message;
		const requestId = _generateRequestId(chat.frUid);
		cachingRequests = cachingRequests.set(requestId, callback);
		switch (type) {
			case Constants.MSG_TYPE.MSG:
	      chat = formatChat(chat);
				message = {type: Constants.MSG_TYPE.MSG, chat: chat, requestId: requestId};
				socket.send(protobuf.encode('message c2c', message));
				break;
			case Constants.MSG_TYPE.QUERY_ANNOUNCEMENT_MSG:
				message = {type: Constants.MSG_TYPE.QUERY_ANNOUNCEMENT_MSG, chat: chat, requestId: requestId};
				socket.send(protobuf.encode('message c2c', message));
				break;
			case Constants.MSG_TYPE.ROOM_MSG_QUERY:
				message = {
					type: Constants.MSG_TYPE.ROOM_MSG_QUERY,
					chat: chat,
					requestId: requestId,
					params: JSON.stringify(params)
				};
				socket.send(protobuf.encode('message c2c', message));
				break;
			case Constants.MSG_TYPE.MARK_READ_TIME:
				message = {type: Constants.MSG_TYPE.MARK_READ_TIME, chat: chat, requestId: requestId};
				socket.send(protobuf.encode('message c2c', message));
				break;
			default:
				break;
		}
		console.log(message);
	})
}

export const closeSocket = () => {
	try {
		socket.close();
	} catch (error) {
	}
}
