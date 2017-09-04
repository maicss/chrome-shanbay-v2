const AppConf = {
  'client_id': 'e7a33e28d619a5d1f7a3',
}

const ShanbayConf = {
  'auth_url': 'https://api.shanbay.com/oauth2/authorize/?response_type=token&client_id=',
  'auth_success_url': '/oauth2/auth/success/'
}

function ShanbayOauth (client_id, conf) {
  this.client_id = client_id
  this.conf = conf
}

/*
  * include lib/config.js and then call initPage in your background page
*/
ShanbayOauth.initPage = function () {
  debugLogger('log', 'init Page')
  window.OAuth = ShanbayOauth.fromConfig(AppConf, ShanbayConf)
  return window.OAuth
}

ShanbayOauth.fromConfig = function (app_conf, shanbay_conf) {
  return new ShanbayOauth(
    app_conf['client_id'],
    shanbay_conf
  )
}

ShanbayOauth.prototype.authorize = function (callback) {
  debugLogger('log', 'in authorize')
  let authorize_url = this.conf.auth_url + '' + this.client_id
  chrome.tabs.create({url: authorize_url}, function (tab) {
    window.OAuth.tabId = tab.id
  })

  this.callback = callback
  chrome.tabs.onUpdated.addListener(this.onAuthorize)
}

ShanbayOauth.prototype.onAuthorize = function (tabId, changeInfo, tab) {
  if (window.OAuth.tabId !== tabId)
    return false

  if (tab.url.indexOf(window.OAuth.conf.auth_success_url) !== -1) {
    // auth success, store access_token to localStorage and close this tab
    let index = tab.url.indexOf('#') + 1
    let hash = tab.url.slice(index, tab.url.length)
    hash = JSON.parse('{"' + decodeURI(hash).replace(/&/g, '","').replace(/=/g, '":"') + '"}')
    localStorage.access_token = hash.access_token
    localStorage.expired_at = new Date((new Date()).getTime() + hash.expires_in * 1000)
    chrome.tabs.get(tabId, function (tab) {
      if (chrome.runtime.lastError) {
      } else {
        chrome.tabs.remove(tab.id)
        notify({
          title: 'Authorized info',
          message: `Authorize successfully`,
          url: ``
        })
      }
    })
    if (window.OAuth.callback) {
      window.OAuth.callback()
    }
  }
}

ShanbayOauth.prototype.checkToken = function (force) {
  if (!this.has_token()) {
    if (force) {
      this.authorize() // force authorize
    } else
      return 2 // no token
  }

  if (this.expired())
    return 1 // token expired

  return 0     // token valid
}

ShanbayOauth.prototype.access_token = function () {
  return localStorage.access_token
}

ShanbayOauth.prototype.has_token = function () {
  return this.access_token !== undefined
}

ShanbayOauth.prototype.expired = function () {
  let expired_at = localStorage.expired_at
  return expired_at === undefined || new Date(expired_at) < new Date()
}

ShanbayOauth.prototype.token_valid = function () {
  return this.has_token() && !this.expired()
}

ShanbayOauth.prototype.clearToken = function () {
  delete localStorage.access_token
  delete localStorage.expired_at
}
