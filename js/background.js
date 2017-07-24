/**
 * @author Maicss, Joseph
 *
 * */

// todo 添加双击选中

var oauth = ShanbayOauth.initPage()

chrome.runtime.onMessage.addListener(function (req, sender, sendReponse) {
  switch (req.action) {
    case 'authorize':
      oauth.authorize(sendReponse)
      break
    case 'wordLookup':
      console.log('const request: ', request)
      console.log('action wordLookup, data: ', req.data)
      request(shanbayAPI.lookUp.url + req.data).then(res => sendReponse(res))
  }
})
// todo 添加options页面

// todo 添加Oauth认证

// todo 添加TTS