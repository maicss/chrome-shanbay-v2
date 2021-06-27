window.__shanbayExtensionAuthInfo = {
  user: null,
  checkAuth (callback) {
    chrome.cookies.getAll({url: 'https://www.shanbay.com'}, cookies => {
      this.user = (cookies.find(cookie => cookie.name === 'userid') || {}).value
      const auth_token = (cookies.find(cookie => cookie.name === 'auth_token') || {}).value
      console.log(auth_token)
      callback(auth_token)
    })
  }
}

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
  switch (req.action) {
    case 'lookup':
      lookUp(req.word)
        .then(res => checkWordAdded(res.id).then(existsRes => {res.exists = existsRes.objects[0].exists; return res}))
        .then(data => chrome.tabs.sendMessage(sender.tab.id, {'action': 'lookup', data}))
        .catch(data => chrome.tabs.sendMessage(sender.tab.id, {'action': 'lookup', data}))
      break
    case 'addOrForget':
      addOrForget(req.word, req.wordID).then(res => {
        chrome.tabs.sendMessage(sender.tab.id, {'action': 'addOrForget', data: res})
      })
      break
    case 'getWordExample':
      getWordExampleSentence(req.id)
        .then(data => chrome.tabs.sendMessage(sender.tab.id, {'action': 'getWordExample', data}))
      break
    case 'playSound':
      playSound(req.url)
      break
    default:
      throw Error('Invalid action type')
  }
})

let taskTimer

const getDailyTask = () => {
  /**
   * 每3小时检测一下今天的剩余单词数量, 必须登录扇贝之后才可以使用
   * @function getDailyTask
   * */
  if (storage.alarm) {
    taskTimer = setInterval(function () {
      if (!storage.alarm) return clearInterval(taskTimer)
      debugLogger('log', 'send daily task request')
      request('https://www.shanbay.com/api/v1/bdc/stats/today/').then(r => {

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
    }, 1000 * 60 * 60 * 3)
  } else {
    if (taskTimer) clearInterval(taskTimer)
  }
}

chrome.storage.onChanged.addListener(changes => {
  const settings = changes.__shanbayExtensionSettings.newValue
  if (Object.keys(settings).length) {
    settings.forEach(item => {
      Object.assign(storage, item)
    })
  }
  getDailyTask()
})

chrome.storage.sync.get('__shanbayExtensionSettings', (settings) => {
  if (Object.keys(settings).length) {
    settings.__shanbayExtensionSettings.forEach(item => {
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
        id: Math.random().toString(36),
        title: '在扇贝网中查找 %s',
        contexts: ['selection'],
      })
      chrome.contextMenus.onClicked.addListener((info, tab) => {
        lookUp(info.selectionText).then(res => {
          chrome.tabs.sendMessage(tab.id, {'action': 'lookup', data: res})
        })
      })
    }
  })
  getDailyTask()
})
