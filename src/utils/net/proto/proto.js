export const c2c = {
	'message msg': {
		'optional string _id': 1,
		'optional uInt32 type': 2, //消息类型
		'optional uInt32 frUid': 3,//发送者userId
		'optional uInt32 toUid': 4,//接收者userId
		'optional uInt32 rid': 5,//相关id,比如讨论组Id,合同Id,发布Id等
		'optional uInt32 aid': 6,//事务Id
		'optional uInt32 toRid': 7,//接收者roleId
		'optional uInt32 frRid': 8,//发送者roleId
		'optional uInt32 sub': 9,//消息子类型
		'optional string name': 10,//发送者名称
		'optional string content': 11,//发送内容
		'optional uInt32 time': 12,//发送时间,不需要填
		'optional uInt32 index': 13,//接收消息的时候会有index做验证
		'optional uInt32 gaId': 14//guestAllianceId 客方盟id 发布聊天为客方盟id，
	},

	'message c2c': {
		'optional uInt32 type': 1,
		'optional string requestId': 2,
		'optional msg chat': 5,//附带的聊天相关消息
		'optional string params': 3,//常用于请求中携带参数,可以是json
		'repeated msg msgList': 4,//返回消息体
		'optional string data': 6//返回的普通消息体，可以是string或者json.stringfy之后的
	}
}