let storage = {}
window.oauth = ShanbayOauth.initPage()
/*=====================使用web音频接口播放音频的方法==================*/
const context = new AudioContext()
const playSound = url => {
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
  if(!token) {
    return chrome.tabs.sendMessage(sender.tab.id, {'action': 'lookup', data: {loading: true, msg: '没有检测到登陆信息，请<a href="https://www.shanbay.com">登陆</a>后点击插件图标认证。'}})
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
    case 'todayTask':
      chrome.cookies.get({url: 'https://www.shanbay.com/bdc/review/', name: 'auth_token'}, function (cookies) {
        request('https://www.shanbay.com/api/v1/bdc/stats/today/', {credentials: 'include'}).then(r => {

          if (r.count === 0) {
            chrome.browserAction.setBadgeText({text: ''})
          } else {
            chrome.browserAction.setBadgeText({text: r.data.num_left + ''})
            notify({
              message: `今天还有${r.data.num_left}个单词需要复习`,
              url: 'https://www.shanbay.com/bdc/review/'
            })
          }

        })
      })
      break
    // case 'getBG':
    //   console.log(window)
    //   (function callbackWindow (a) {
    //     a(window)
    //   })(sendResponse)
    //   break
  }
})


chrome.storage.sync.get('chromeShanbaySettings', (settings) => {
  if (Object.keys(settings).length) {
    settings.chromeShanbaySettings.forEach(item => {
      Object.assign(storage, item)
    })
  } else {
    storage = storageSettingMap
  }
})

// contentMenu

chrome.contextMenus.removeAll(function () {
  if (storage.contextLookup) {
    chrome.contextMenus.create({
      title: '在扇贝网中查找%s',
      contexts: ['selection'],
      onclick: function (info, tab) {
        lookUp(info.selectionText, token).then(res => {
          chrome.tabs.sendMessage(tab.id, {'action': 'lookup', data: res})
        })
      }
    })
  }
})