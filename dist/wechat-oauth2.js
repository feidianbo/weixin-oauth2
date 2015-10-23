'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var request = require('request');
var querystring = require('querystring');

var AccessToken = (function () {
    function AccessToken(data) {
        _classCallCheck(this, AccessToken);

        if (!(this instanceof AccessToken)) {
            return new AccessToken(data);
        }
        this.data = data;
    }

    _createClass(AccessToken, [{
        key: 'valid',
        get: function get() {
            return !!this.data.access_token && new Date().getTime() < this.data.create_at + this.data.expires_in * 1000;
        }
    }]);

    return AccessToken;
})();

var WeChatOAuth2 = (function () {
    /*
     * @param {String} appid 在公众平台上申请得到的appid
     * @param {String} appsecret 在公众平台上申请得到的app secret
     * @param {Function} getToken 用于获取token的方法
     * @param {Function} setToken 用于保存token的方法
     */

    function WeChatOAuth2(appid, appsecret, getToken, setToken) {
        var _this = this;

        _classCallCheck(this, WeChatOAuth2);

        this.appid = appid;
        this.appsecret = appsecret;

        this.store = {};
        this.getToken = getToken || function (openid, callback) {
            callback(null, _this.store[openid]);
        };

        if (!setToken && process.env.NODE_ENV === 'production') {
            console.warn("Please do not save AccessToken into memory in production!");
        }

        this.setToken = setToken || function (openid, token, callback) {
            _this.store[openid] = token;
            callback(null);
        };
    }

    /*!
     * 处理token，更新过期时间
     */

    /*
     * 通过code换取网页授权access_token.
     * 如果网页授权的作用域为snsapi_base, 则本步骤中获取到网页授权access_token
     * 的同时, 也获取到了openid, snsapi_base式的网页授权流程即到此为止。
     * @param {String} code
     * @param {Function} callback
     */

    _createClass(WeChatOAuth2, [{
        key: '_getAccessToken',
        value: function _getAccessToken(code, callback) {
            var url = 'https://api.weixin.qq.com/sns/oauth2/access_token';
            var info = {
                appid: this.appid,
                secret: this.appsecret,
                code: code,
                grant_type: 'authorization_code'
            };

            request({
                url: url,
                qs: info,
                json: true
            }, errHandlerWrapper(processToken(this, callback)));
        }
    }, {
        key: '_refreshAccessToken',
        value: function _refreshAccessToken(refresh_token, callback) {
            var url = 'https://api.weixin.qq.com/sns/oauth2/refresh_token';
            var info = {
                appid: this.appid,
                grant_type: 'refresh_token',
                refresh_token: refresh_token
            };

            request({
                url: url,
                qs: info,
                json: true
            }, errHandlerWrapper(processToken(this, callback)));
        }
    }, {
        key: '_verifyAccessToken',
        value: function _verifyAccessToken(openid, accessToken, callback) {
            var url = 'https://api.weixin.qq.com/sns/auth';
            var info = {
                access_token: accessToken,
                openid: openid
            };

            request({
                url: url,
                qs: info,
                json: true
            }, errHandlerWrapper(callback));
        }
    }, {
        key: '_getUser',
        value: function _getUser(openid, accessToken, callback) {
            var url = 'https://api.weixin.qq.com/sns/userinfo';
            var info = {
                access_token: accessToken,
                openid: openid,
                lang: 'zh_CN'
            };
            request({
                url: url,
                qs: info,
                json: true
            }, errHandlerWrapper(callback));
        }

        /* 对外接口 */

    }, {
        key: 'urlForAuth',
        value: function urlForAuth(continueUrl) {
            var scope = arguments.length <= 1 || arguments[1] === undefined ? 'snsapi_base' : arguments[1];
            var state = arguments.length <= 2 || arguments[2] === undefined ? '' : arguments[2];

            var info = {
                appid: this.appid,
                redirect_uri: continueUrl,
                response_type: 'code',
                scope: scope,
                state: state
            };

            return 'https://open.weixin.qq.com/connect/oauth2/authorize?' + querystring.stringify(info) + '#wechat_redirect';
        }
    }, {
        key: 'getUserInfo',
        value: function getUserInfo(code, callback) {
            var that = this;

            // TODO 缓存accessToken?
            this._getAccessToken(code, function (err, res) {
                if (err) {
                    callback(err);
                } else {
                    that._getUser(res.data.openid, res.data.access_token, function (err, response, body) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, body);
                        }
                    });
                }
            });
        }
    }, {
        key: 'getUserBase',
        value: function getUserBase(code, callback) {
            var that = this;

            this._getAccessToken(code, function (err, res) {
                if (err) callback(err);else callback(null, { "openid": res.data.openid });
            });
        }
    }]);

    return WeChatOAuth2;
})();

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

var errHandlerWrapper = function errHandlerWrapper(callback) {
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