'use strict';

var should = require('chai').should();
var nock = require('nock');
var OAuth = require('../');

// configuration
var appid = 'wxc8243286934dee9a';
var appsecret = '4f5f80dfa2d77d1aecb773772f537d6b';

describe('WeChatOAuth2', function() {
    var auth = new OAuth(appid, appsecret);

    describe('#urlForAuth', function() {
        it('should OK', function() {
            auth.urlForAuth('http://i.meituan.com/jiudian').should.equal('https://open.weixin.qq.com/connect/oauth2/authorize?appid=wxc8243286934dee9a&redirect_uri=http%3A%2F%2Fi.meituan.com%2Fjiudian&response_type=code&scope=snsapi_base&state=#wechat_redirect');
        });
    });

    describe('#_getAccessToken', function() {
        describe('when code is invalid', function() {
            it('should handle exceptions', function(done) {
                auth._getAccessToken('code', function (err, res, body) {
                    err.should.exist;
                    err.name.should.equal('WeChatAPIError');
                    err.message.should.contain('invalid code');
                    done();
                });
            });
        });

        describe('when code is valid', function() {
            /*
             * When you setup an interceptor for an URL and that interceptor is
             * used, it is removed from the interceptor list.
             * 每个截获函数只使用一遍, 用完就从列表中删除了. 所以, 不要期望每次
             * nock调用能持续截获请求.
             */
            before(function() {
                nock('https://api.weixin.qq.com')
                .get('/sns/oauth2/access_token')
                .query(true)
                .reply(200, {
                    "access_token":"ACCESS_TOKEN",
                    "expires_in":7200,
                    "refresh_token":"REFRESH_TOKEN",
                    "openid":"OPENID",
                    "scope":"SCOPE"
                });
            });

            it('should return data', function(done) {
                auth._getAccessToken('code', function (err, res, body) {
                    should.not.exist(err);
                    body.should.have.property('data');
                    body.data.should.have.keys('access_token', 'expires_in', 'refresh_token', 'openid', 'scope', 'create_at');
                    done();
                });
            });
        });
    });

    describe('#_refreshAccessToken', function() {
        describe('when refresh_token is invalid', function() {
            before(function () {
                nock.cleanAll();
            });

            it('should handle exceptions', function(done) {
                auth._refreshAccessToken('refresh', function (err, res, body) {
                    err.should.exist;
                    err.name.should.equal('WeChatAPIError');
                    err.message.should.contain('invalid refresh_token');
                    done();
                });
            });
        });

        describe('when refresh_token is valid', function() {
            before(function() {
                nock('https://api.weixin.qq.com')
                .get('/sns/oauth2/refresh_token')
                .query(true)
                .reply(200, {
                    "access_token":"ACCESS_TOKEN",
                    "expires_in":7200,
                    "refresh_token":"REFRESH_TOKEN",
                    "openid":"OPENID",
                    "scope":"SCOPE"
                });
            });

            it('should return data', function(done) {
                auth._refreshAccessToken('refresh', function (err, res, body) {
                    should.not.exist(err);
                    body.should.have.property('data');
                    body.data.should.have.keys('access_token', 'expires_in', 'refresh_token', 'openid', 'scope', 'create_at');
                    done();
                });
            });
        });
    });

    describe('#_verifyAccessToken', function () {
        describe('when AccessToken is invalid', function () {
            before(function () {
                nock.cleanAll();
            });

            it('should handle exceptions', function(done) {
                auth._verifyAccessToken('openid', 'token', function (err, res, body) {
                    err.should.exist;
                    err.name.should.equal('WeChatAPIError');
                    err.message.should.contain('invalid');
                    done();
                });
            });
        });

        describe('when AccessToken is valid', function () {
            before(function() {
                nock('https://api.weixin.qq.com')
                .get('/sns/auth')
                .query(true)
                .reply(200, {
                    "errcode": 0,
                    "errmsg": "ok"
                });
            });

            it('should return data', function(done) {
                auth._verifyAccessToken('openid', 'token', function (err, res, body) {
                    should.not.exist(err);
                    body.should.have.property('errmsg').and.equal('ok');
                    done();
                });
            });
        });
    });

    describe('#_getUserInfo', function () {
        describe('when code is valid', function () {
            before(function () {
                nock('https://api.weixin.qq.com')
                .get('/sns/oauth2/access_token')
                .query(true)
                .reply(200, {
                    "access_token":"ACCESS_TOKEN",
                    "expires_in":7200,
                    "refresh_token":"REFRESH_TOKEN",
                    "openid":"OPENID",
                    "scope":"SCOPE"
                })
                .get('/sns/userinfo')
                .query({
                    "access_token": "ACCESS_TOKEN",
                    "openid": "OPENID",
                    "lang": "zh_CN"
                })
                .reply(200, {
                    "openid":" OPENID",
                    "nickname": "NICKNAME",
                    "sex":"1",
                    "province":"PROVINCE",
                    "city":"CITY",
                    "country":"COUNTRY",
                     "headimgurl": "http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/46",
                     "privilege":[ "PRIVILEGE1", "PRIVILEGE2" ]
                });
            });

            it('should return data', function (done) {
                auth.getUserInfo('code', function (err, user) {
                    should.not.exist(err);
                    user.should.have.property('nickname').and.equal('NICKNAME');
                    done();
                });
            });
        });
    });
});
