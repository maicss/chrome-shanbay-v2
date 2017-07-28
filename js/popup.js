const bg = chrome.extension.getBackgroundPage()

function renderUser () {

  function callback (user) {
    const header = document.querySelector('#header')
    const batchAddBtn = document.querySelector('#batch-add')
    const learnBtn = document.querySelector('#begin-learning')
    const settingBtn = document.querySelector('#options')
    const logout = document.querySelector('#logout')

    const headerImg = header.querySelector('img')
    const userLink = header.querySelector('a')
    userLink.href = 'http://www.shanbay.com/user/list/' + user.username
    userLink.onclick = function () {
      chrome.tabs.create({
        url: this.href
      })
    }

    logout.onclick = function () {
      bg.oauth.clearToken()
      delete bg.User
      notify({title: 'Authorized info', message: `Deauthorize successfully.`})
      window.close()
    }
    headerImg.src = user.avatar.replace('128w_128h', '40w_40h')
    // 显示头像、菜单和退出，隐藏授权按钮
    header.classList = ''
    document.querySelector('#authorization').className = 'hide'
    batchAddBtn.classList = ''
    learnBtn.classList = ''
    settingBtn.classList = ''
    logout.classList = ''
    bg.User = user
  }

  if (bg.User) {
    callback(bg.User)
    return
  }

  if (bg.oauth.token_valid()) {
    userInfo(bg.oauth.access_token()).then(userInfo => {
      callback(userInfo)
    })
  } else {
    chrome.runtime.sendMessage({
      action: 'authorize'
    }, function () {
      renderUser()
    })
  }
}

document.addEventListener('DOMContentLoaded', function () {
  renderUser()
  document.querySelector('#authorization').onclick = function () {
    renderUser()
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
})