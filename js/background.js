/**
 * @author Maicss, Joseph
 *
 * */

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
  switch (req.action) {
    case 'authorize':
      oauth.authorize(sendResponse)
      break
    case 'lookup':
      lookUp(req.word, oauth.access_token()).then(res => {
        chrome.tabs.sendMessage(sender.tab.id, {'action': 'lookup', data: res})
      })
      break
    case 'addWord':
      addWord(req.id, oauth.access_token()).then(res => {
        chrome.tabs.sendMessage(sender.tab.id, {'action': 'addWord', data: res})
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
  }
})


chrome.storage.sync.get('chromeShanbaySettings', (settings) => {
  console.log('Extension loaded......')
  console.log(document.readyState)
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
        lookUp(info.selectionText, oauth.access_token()).then(res => {
          chrome.tabs.sendMessage(tab.id, {'action': 'lookup', data: res})
        })
      }
    })
  }
})
// todo 添加options页面

// todo 添加Oauth认证

// todo 添加TTS