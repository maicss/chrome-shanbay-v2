/**
 * @author Maicss, Joseph
 *
 * */

// todo 添加双击选中

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
// todo 添加options页面

// todo 添加Oauth认证

// todo 添加TTS