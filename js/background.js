/**
 * @author Maicss, Joseph
 *
 * */

// todo 添加双击选中
let storage = {}
window.oauth = ShanbayOauth.initPage()

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