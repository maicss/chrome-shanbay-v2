function makeRequest(method, url, data, callback){
  console.log('request url', url);
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function(){
    if (xhr.readyState == 4){
      callback(JSON.parse(xhr.responseText));
    }
  };
  xhr.open(method, url, true);
  xhr.send(data);
}

function renderUser(){
  function callback(user){
    var user_link = document.getElementById('home');
    user_link.href = 'http://www.shanbay.com/user/list/'+user.username;
    user_link.onclick=function(){
      chrome.tabs.create({url:this.href})
    };

    document.getElementById('logout').onclick = function(){
      bg.oauth.clearToken();
      delete bg.User;
      window.close();
    }

    var img = document.getElementById('avatar');
    img.src = user.avatar.replace('128w_128h', '80w_80h');

    var nickname = document.getElementById('nickname');
    nickname.innerText = user.nickname;
    bg.User = user;
  }

  const bg = chrome.extension.getBackgroundPage();
  console.log('bg: ', bg)
  if (bg.User){
    callback(bg.User);
    return;
  }

  if (bg.oauth.token_valid()){
    const account_api = bg.oauth.conf.api_root + '/account/?access_token=' + bg.oauth.access_token();
    makeRequest('GET', account_api, null, callback);
  } else {
    // chrome.runtime.sendMessage({action:'authorize'}, function(){
    //   renderUser();
    // })
  }
}

document.addEventListener('DOMContentLoaded', function () {
  renderUser();
});