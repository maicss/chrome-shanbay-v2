/**
 * @author Maicss, Joseph
 *
 * */

// const oauth = ShanbayOauth.initPage();
//
// function logout(){
//   oauth.clearToken();
// }
//
// chrome.runtime.onMessage.addListener(function(request, sender, sendReponse){
//   if (request.action === 'authorize'){
//     oauth.authorize(sendReponse);
//   }
// })

// todo 添加双击选中

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    sendResponse({request, sender})
  })

// todo 添加options页面

// todo 添加Oauth认证

// todo 添加TTS
