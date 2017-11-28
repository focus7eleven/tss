/**
 * Created by zp on 16/10/14.
 */
var constants = {
    mongo_url: 'mongodb://192.168.1.100:27017',
    mongo_db1:"test",
    mongo_db2:"test1",
    redis_url: 'redis://192.168.1.100:6378',
    friend_key : 'friend',
    connectors_path:process.env.product?"/connectors-p":"/connectors",
    min_connectors:5,
    backends_path:process.env.product?"/backends-p":"/backends",
    min_backends:4,
    CLEAR_CLIENT_TIME:60*60*1000,
    REQUEST_TIMEOUT:20000,
    MAX_DATA_LENGTH:10000,
    VALID_AGENTS:['Web','Android','iOS'],
    zookeeper_url:"192.168.1.100:2182,192.168.1.100:2183,192.168.1.100:2184",
    PORT_DISTANCE: 7,//thrift-server与backend-server的端口差
    CHAT_TYPE:{
        HOLDER:1,//先占位
        FRIEND_CHAT:2,//好友私聊
        GROUP:3,//群聊
        ANNOUNCEMENT:4,//发布聊天
        AFFAIR_CHAT:5,//事务内私聊
        TWO_ALLIANCE_CHAT:6
    },
    CHAT_SUBTYPE:{
        DEFAULT:0,//普通信息
        FILE: 1,//普通文件
        IMAGE: 2,//图片
        VIDEO: 3,//视频
        AUDIO: 4,//音频
        FUND: 5,//资金
        TRADE: 11,//交易
        TRANSFER: 21,//转移
        CONTRACT: 31,//合同
        CONFERENCE_INVATATION: 41,
    },
    SUBTYPE_STRING: {
      0: '普通消息',
      1: '文件',
      2: '图片',
      3: '视频',
      4: '音频',
      5: '资金',
      11: '交易',
      21: '转移',
      31: '合同'
    },
    REQUEST_CODE:{
        REGISTER:0,//注册
        RELAY:1,//消息转发
        REQUEST:2//查询是否合法
    },
    MSG_TYPE:{
        MSG:0,
        PING:1,
        PONG:2,
        BUMPED:3,//用户被挤掉
        NEW_LOGIN:4,//某个用户新设备登录
        STATUS:5,//查询当前用户登录设备情况
        REDIRECT:6,//重定向
        ROOM_MSG_QUERY:7,//消息查询
        MARK_READ_TIME:8,//标记聊天时间
        CHECK_INDEX:9,//
        RESPONSE:10,
        ERROR:11,
        SIGN_IN:12,
        GET_UNREAD_COUNT:13,
        QUERY_ANNOUNCEMENT_MSG:14,//查询发布下面的所有聊天
        UPDATE_CACHE:15,
        SYSTEM:16
    },
    CACHE_UPDATE_EVENT_TYPE:{
        UN_GROUP : 1,//群组解散
        REMOVE_MEMBER_FROM_GROUP : 2,//群组移除成员
        ADD_MEMBER_TO_GROUP : 3,//群组添加成员
        REMOVE_MEMBER_FROM_AFFAIR : 4,//事务添加成员
        ADD_MEMBER_TO_AFFAIR : 5,//事务移除成员
        DISABLE_AFFAIR : 6//失效事务
    },
    rootDir:__dirname
}

module.exports = constants;
