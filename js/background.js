window.oauth = ShanbayOauth.initPage()
window.__shanbayExtensionAuthInfo = {
  getAuthCookies: false,
  isValid () {
    return this.expiration_date && this.expiration_date > new Date() * 1
  }
}

chrome.cookies.getAll({url: 'https://www.shanbay.com'}, cookiesArray => {
  for (let cookie of cookiesArray) {
    if (neededCookieNames.includes(cookie.name) && cookie.value.trim()) {
      window.__shanbayExtensionAuthInfo.getAuthCookies = true
      if (cookie.name === 'auth_token') {
        window.__shanbayExtensionAuthInfo.expiration_date = cookie.expirationDate
      }
      window.__shanbayExtensionAuthInfo[cookie.name] = cookie.value
    }
  }
  if (!window.__shanbayExtensionAuthInfo) {
    notify({
      message: '没有获取到扇贝网的登录信息，点击通知登录。',
      url: 'https://web.shanbay.com/web/account/login/'
    })
  }
})

/*=====================使用web音频接口播放音频的方法==================*/
const playSound = url => {
  const context = new AudioContext()
  request(url, {type: 'buffer'}).then(r => {
    context.decodeAudioData(r, function (buffer) {
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)
      source.start(0)
    })
  })
}
/*=================================================================*/

chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
  const token = oauth.access_token()
  if(req.action !== 'authorize' && !token) {
    return chrome.tabs.sendMessage(sender.tab.id, {'action': 'lookup', data: {loading: true, msg: '没有检测到登陆信息，请<a href="https://www.shanbay.com">登陆</a>后点击<strong>插件图标</strong>认证。'}})
  }
  switch (req.action) {
    case 'authorize':
      oauth.authorize(sendResponse)
      break
    case 'lookup':
      lookUp(req.word, token).then(res => {
        chrome.tabs.sendMessage(sender.tab.id, {'action': 'lookup', data: res})
      })
      break
    case 'addWord':
      addWord(req.id, token).then(res => {
        chrome.tabs.sendMessage(sender.tab.id, {'action': 'addWord', data: res})
      })
      break
    case 'forgetWord':
      forget(req.learningId, token).then(res => {
        chrome.tabs.sendMessage(sender.tab.id, {'action': 'forgetWord', data: res})
      })
      break
    case 'playSound':
      playSound(req.url)
      break
    default:
      throw Error('Invalid action type')
  }
})


const getDailyTask = () => {
  /**
   * 每3小时检测一下今天的剩余单词数量, 必须登录扇贝之后才可以使用
   * @function getDailyTask
   * */
  let taskTimer
  taskTimer = setInterval(function () {
    if (!storage.alarm && taskTimer) {
      clearInterval(taskTimer)
    } else {
      debugLogger('log', 'send daily task request')
      chrome.cookies.get({url: 'https://www.shanbay.com/bdc/review/', name: 'auth_token'}, function () {
        request('https://www.shanbay.com/api/v1/bdc/stats/today/', {credentials: 'include'}).then(r => {

          if (r.data.num_left === 0) {
            chrome.browserAction.setBadgeText({text: ''})
          } else {
            chrome.browserAction.setBadgeText({text: r.data.num_left + ''})
            notify({
              message: `今天还有${r.data.num_left}个单词需要复习`,
              url: 'https://www.shanbay.com/bdc/review/'
            })
          }

        }).catch(e => debugLogger('error', 'get daily task failed, cause: ', e))
      })
    }
  }, 1000 * 60 * 60 * 3)

}


chrome.storage.sync.get('chromeShanbaySettings', (settings) => {
  if (Object.keys(settings).length) {
    settings.chromeShanbaySettings.forEach(item => {
      Object.assign(storage, item)
    })
  } else {
    storage = storageSettingMap
  }

  // contentMenu
  chrome.contextMenus.removeAll(function () {
    if (storage.contextLookup) {
      debugLogger('info', 'contextMenu added')
      chrome.contextMenus.create({
        title: '在扇贝网中查找 %s',
        contexts: ['selection'],
        onclick: function (info, tab) {
          lookUp(info.selectionText, oauth.access_token()).then(res => {
            chrome.tabs.sendMessage(tab.id, {'action': 'lookup', data: res})
          })
        }
      })
    }
  })
  getDailyTask()
})
