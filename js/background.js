import {
  debugLogger, storageSettingMap, request, lookUp, checkWordAdded,
  addOrForget, getWordExampleSentence, getDailyTaskCount, defaultIgnoreSites
} from './const.mjs'


/**
 * Plays audio files from extension service workers
 * @param {string} source - path of the audio file
 * @param {number} volume - volume of the playback
 */
async function createOffscreen() {
  return chrome.offscreen.hasDocument()
    .then(flag => {
      if (!flag) {
        return chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'testing'
        })
      }
    })
}

const storage = {}
/*=====================使用web音频接口播放音频的方法==================*/
const playSound = url => {
  request(url, {type: 'buffer'}).then(r => {
    createOffscreen().then(()=>{
      chrome.runtime.sendMessage({action: 'playSound', target: 'offscreen', url}).then(()=>{
        debugLogger('log', "background.js send message!")
      })
    })
    .catch()
  })
}
/*=================================================================*/

chrome.runtime.onMessage.addListener(function (req, sender, sendResponse) {
  switch (req.action) {
    case 'lookup':
      lookUp(req.word)
        .then(res => checkWordAdded(res.id).then(existsRes => {res.exists = existsRes.objects[0].exists; return res}))
        .then(data => {
          data.__shanbayExtensionSettings = {autoRead: storage.autoRead}
          chrome.tabs.sendMessage(sender.tab.id, {action: 'lookup', data})
        })
        .catch(data => {
          let error = {}
          if (data.message === 'Failed to fetch') {
            error.status = 400
            error.msg = '请求失败，请登录后刷新本页面'
          } else {
            error = data
          }
          chrome.tabs.sendMessage(sender.tab.id, {action: 'lookup', data: error})
        })
      break
    case 'addOrForget':
      addOrForget(req.word, req.wordID).then(res => {
        chrome.tabs.sendMessage(sender.tab.id, {action: 'addOrForget', data: res})
      })
      break
    case 'getWordExample':
      getWordExampleSentence(req.id)
        .then(data => chrome.tabs.sendMessage(sender.tab.id, {action: 'getWordExample', data}))
      break
    case 'playSound':
      playSound(req.url)
      break
    case 'getAuthInfo':
      chrome.cookies.getAll({domain: 'shanbay.com', name: 'auth_token'}, cookies => {
        console.log('request getAuthInfo', cookies)
        sendResponse((cookies[0] || {}).value)
      })
      break
    default:
      throw Error('Invalid action type')
  }
  return true
})

  /**
   * 每3小时检测一下今天的剩余单词数量, 必须登录扇贝之后才可以使用
   * @function getDailyTask
   * */
const getDailyTask = () => {
  const reminderName = 'remindAlarm'
  if (storage.alarm) {
    chrome.alarms.create(reminderName, {
      delayInMinutes: 60,
      periodInMinutes: 180
    })
    chrome.alarms.onAlarm.addListener(() => {
      if (!storage.alarm) return chrome.alarms.clear(reminderName)
      debugLogger('log', 'send daily task request')
      getDailyTaskCount().then(r => {
        if (r.total === 0) {
          chrome.action.setBadgeText({text: ''})
        } else {
          chrome.action.setBadgeText({text: r.total + ''})
          notify({
            message: `今天还有${r.total}个单词需要复习`,
            url: 'https://web.shanbay.com/wordsweb/#/collection'
          })
        }
      }).catch(e => debugLogger('error', 'get daily task failed, cause: ', e))
    })
  } else {
    chrome.alarms.clear(reminderName)
  }
}

/**
 * 根据网页上选择的文本进行查询
 */
const lookUpBySelection = async (tabId) => {
  try {
    // 获取网页中选择的文本
    const [{result}] = await chrome.scripting.executeScript({
      target: {tabId: tabId},
      func: () => getSelection().toString(),
    });

    // 查询单词
    const res = await lookUp(result);
    const existsRes = await checkWordAdded(res.id);
    res.exists = existsRes.objects[0].exists;
    res.__shanbayExtensionSettings = {autoRead: storage.autoRead};

    // 发送事件，弹窗
    chrome.tabs.sendMessage(tabId, {action: 'lookup', data: res});
  } catch (e) {
    console.error(e);
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
    Object.assign(storage, storageSettingMap)
  }

  // contentMenu
  chrome.contextMenus.removeAll(function () {
    if (defaultIgnoreSites.some(site => location.hostname.includes(site))) return
    if (storage.ignoreSites && storage.ignoreSites.some(site => location.hostname.includes(site))) return
    if (storage.contextLookup) {
      debugLogger('info', 'contextMenu added')
      chrome.contextMenus.create({
        id: Math.random().toString(36),
        title: '在扇贝网中查找 %s',
        contexts: ['selection'],
      })
      chrome.contextMenus.onClicked.addListener((info, tab) => {
        lookUp(info.selectionText)
        .then(res => checkWordAdded(res.id).then(existsRes => {res.exists = existsRes.objects[0].exists; return res}))
        .then(res => {
          res.__shanbayExtensionSettings = {autoRead: storage.autoRead}
          chrome.tabs.sendMessage(tab.id, {action: 'lookup', data: res})
          })
        .catch(data => chrome.tabs.sendMessage(tab.id, {action: 'lookup', data}))
      })
    }
  })
  getDailyTask()
})

chrome.commands.onCommand.addListener(async (command, tab) => {
  switch (command) {
    case "look-up-in-shanbay":
      lookUpBySelection(tab.id);
      break;

    default:
      break;
  }
});
