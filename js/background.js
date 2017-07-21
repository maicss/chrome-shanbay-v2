/**
 * @author Maicss, Joseph
 *
 * */

// todo 添加双击选中

var oauth = ShanbayOauth.initPage();

chrome.runtime.onMessage.addListener(function(request, sender, sendReponse){
    if (request.action === 'authorize'){
        oauth.authorize(sendReponse);
    }
})
// todo 添加options页面

// todo 添加Oauth认证

// todo 添加TTS