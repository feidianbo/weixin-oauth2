# weixin-oauth2

微信网页授权OAuth2.0的Node模块, 可用于获取用户信息.

## 安装

`npm install weixin-oauth2`

## 使用

```javascript
var Oauth2 = require('weixin-oauth2');
var oauth = new OAuth2('app id', 'secret');

/* 请求授权的页面地址 */
var url = oauth.urlForAuth('授权之后访问的地址, 用于接收code', 'snsapi_userinfo')

/* 获取基本信息 */
oauth.getUserBase('code', function (err, user_base) {
    /**
     * user_base:  { openid: 'xxxx' }
     */
});

/* 获取用户详细信息 */
oauth.getUserInfo('code', function (err, user_info) {
    /**
     * user_info: {
     *     "openid":" OPENID",
     *     "nickname": NICKNAME,
     *     "sex":"1",
     *     "province":"PROVINCE"
     *     "city":"CITY",
     *     "country":"COUNTRY",
     *     "privilege":[ "PRIVILEGE1", "PRIVILEGE2" ],
     *     "unionid": "o6_bmasdasdsad6_2sgVt7hMZOPfL"
     *  }
     */
});
```
