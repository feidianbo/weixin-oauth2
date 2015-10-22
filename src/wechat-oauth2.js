'use strict';

var request = require('request');
var querystring = require('querystring');

class AccessToken {
    constructor(data) {
        if (!(this instanceof AccessToken)) {
            return new AccessToken(data);
        }
        this.data = data;
    }

    get valid() {
        return !!this.data.access_token &&
            (new Date().getTime()) < (this.data.create_at + this.data.expires_in * 1000);
    }
}

class WeChatOAuth2 {
    /*
     * @param {String} appid 在公众平台上申请得到的appid
     * @param {String} appsecret 在公众平台上申请得到的app secret
     * @param {Function} getToken 用于获取token的方法
     * @param {Function} setToken 用于保存token的方法
     */
    constructor(appid, appsecret, getToken, setToken) {
        this.appid = appid;
        this.appsecret = appsecret;

        this.store = {};
        this.getToken = getToken || ((openid, callback) => {
            callback(null, this.store[openid]);
        });

        if (!setToken && process.env.NODE_ENV === 'production') {
          console.warn("Please do not save AccessToken into memory in production!");
        }

        this.setToken = setToken || ((openid, token, callback) => {
            this.store[openid] = token;
            callback(null);
        });
    }

    /*
     * 通过code换取网页授权access_token.
     * 如果网页授权的作用域为snsapi_base, 则本步骤中获取到网页授权access_token
     * 的同时, 也获取到了openid, snsapi_base式的网页授权流程即到此为止。
     * @param {String} code
     * @param {Function} callback
     */
    _getAccessToken(code, callback) {
        let url = 'https://api.weixin.qq.com/sns/oauth2/access_token';
        let info = {
          appid: this.appid,
          secret: this.appsecret,
          code: code,
          grant_type: 'authorization_code'
        };

        request({
            url,
            qs: info ,
            json: true
        }, errHandlerWrapper(processToken(this, callback)));
    }

    _refreshAccessToken(refresh_token, callback) {
        let url = 'https://api.weixin.qq.com/sns/oauth2/refresh_token';
        let info = {
          appid: this.appid,
          grant_type: 'refresh_token',
          refresh_token: refresh_token
        };

        request({
            url,
            qs: info ,
            json: true
        }, errHandlerWrapper(processToken(this, callback)));
    }

    _verifyAccessToken(openid, accessToken, callback) {
        let url = 'https://api.weixin.qq.com/sns/auth';
        let info = {
          access_token: accessToken,
          openid: openid
        };

        request({
            url,
            qs: info,
            json: true
        }, errHandlerWrapper(callback));
    }

    /* 对外接口 */

    urlForAuth(continueUrl, scope='snsapi_base', state='') {
        var info = {
          appid: this.appid,
          redirect_uri: continueUrl,
          response_type: 'code',
          scope: scope,
          state: state
        };

        return `https://open.weixin.qq.com/connect/oauth2/authorize?${querystring.stringify(info)}#wechat_redirect`;
    }

    getUserInfo() {
    }

    getUserBase() {
    }
}

/*!
 * 处理token，更新过期时间
 */
function processToken(context, callback) {
    return function (err, res, body) {
        if (err) {
            return callback(err, body);
        }

        // 记录token的获取时间
        body.create_at = new Date().getTime();

        // 存储token
        context.setToken(body.openid, body, function (err) {
            callback(err, new AccessToken(body));
        });
    };
}

var errHandlerWrapper = function (callback) {
    return function (err, res, body) {
        callback = callback || function () {};
        if (err) {
            err.name = 'WeChatAPI' + err.name;
            return callback(err, res, body);
        }
        /*
         * 错误时返回JSON数据. 全局返回码说明:
         * http://mp.weixin.qq.com/wiki/17/fa4e1434e57290788bde25603fa2fcbd.html
         */
        if (body.errcode) {
            err = new Error(body.errmsg);
            err.name = 'WeChatAPIError';
            err.code = body.errcode;
            return callback(err, res, body);
        }
        callback(null, res, body);
    };
};

module.exports = WeChatOAuth2;
