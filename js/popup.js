var bg = chrome.extension.getBackgroundPage()

function renderUser() {

  function callback(user) {
    // todo: 通知授权成功
    var header = document.querySelector('#header')
    var batchAddBtn = document.querySelector('#batch-add')
    var learnBtn = document.querySelector('#begin-learning')
    var settingBtn = document.querySelector('#options')
    var logout = document.querySelector('#logout')

    var headerImg = header.querySelector('img');
    var userLink = header.querySelector('a');
    userLink.href = 'http://www.shanbay.com/user/list/' + user.username;
    userLink.onclick = function () {
      chrome.tabs.create({
        url: this.href
      })
    };

    logout.onclick = function () {
      bg.oauth.clearToken();
      delete bg.User;
      notify('Authorized info', `Deauthorize successfully.`)
      window.close();
    }
    headerImg.src = user.avatar.replace('128w_128h', '80w_80h');
    // 显示头像、菜单和退出，隐藏授权按钮
    header.classList = ''
    document.querySelector('#authorization').classList = 'hide'
    batchAddBtn.classList = ''
    learnBtn.classList = ''
    settingBtn.classList = ''
    logout.classList = ''
    bg.User = user;
  }


  if (bg.User) {
    callback(bg.User);
    return;
  }

  if (bg.oauth.token_valid()) {
    const account_api = bg.oauth.conf.api_root + '/account/?access_token=' + bg.oauth.access_token();
    // makeRequest('GET', account_api, null, callback);
    request(account_api).then(userInfo => {
      notify('Authorized info', `Authorize successfully, name: ${userInfo.username}`, `http://www.shanbay.com/user/list/${userInfo.username}`)
      callback(userInfo)
    })
  } else {
    chrome.runtime.sendMessage({
      action: 'authorize'
    }, function () {
      renderUser();
    })
  }
}

document.addEventListener('DOMContentLoaded', function () {
  renderUser();
  document.querySelector('#authorization').onclick = function () {
    renderUser();
  }
  document.querySelector('#batch-add').onclick = function () {
    chrome.tabs.create({url: 'http://www.shanbay.com/bdc/vocabulary/add/batch/'})
  }
  document.querySelector('#begin-learning').onclick = function () {
    chrome.tabs.create({url: 'http://www.shanbay.com/bdc/review/'})
  }
  document.querySelector('#options').onclick = function () {
    chrome.tabs.create({url: 'options.html'})
  }
});