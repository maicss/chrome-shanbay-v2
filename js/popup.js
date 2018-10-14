const bg = chrome.extension.getBackgroundPage()

function renderUser () {

  function callback ({data: user}) {
    const header = document.querySelector('#header')
    const batchAddBtn = document.querySelector('#batch-add')
    const learnBtn = document.querySelector('#begin-learning')
    const settingBtn = document.querySelector('#options')

    const headerImg = header.querySelector('img')
    const userLink = header.querySelector('a')
    userLink.href = 'https://www.shanbay.com/user/list/' + user.username
    userLink.onclick = function () {
      chrome.tabs.create({
        url: this.href
      })
    }

    headerImg.src = user.avatar.replace('128w_128h', '40w_40h')
    // 显示头像、菜单和退出，隐藏授权按钮
    header.className = ''
    batchAddBtn.className = ''
    learnBtn.className = ''
    settingBtn.className = ''
    bg.__shanbayExtensionAuthInfo.User = user
  }

  if (bg.__shanbayExtensionAuthInfo.User) return callback({data: bg.__shanbayExtensionAuthInfo.User})

  bg.__shanbayExtensionAuthInfo.checkAuth(function (auth) {
    if (auth) {
      userInfo().then(userInfo => {
        callback(userInfo)
      })
    } else {
      notify({
        title: '没有登录信息',
        message: '没有获取到扇贝网的登录信息，点击登录。',
        url: 'https://web.shanbay.com/web/account/login/'
      })
    }
  })
}

document.addEventListener('DOMContentLoaded', function () {
  renderUser()
  document.querySelector('#batch-add').onclick = function () {
    chrome.tabs.create({url: 'https://www.shanbay.com/bdc/vocabulary/add/batch/'})
  }
  document.querySelector('#begin-learning').onclick = function () {
    chrome.tabs.create({url: 'https://www.shanbay.com/bdc/review/'})
  }
  document.querySelector('#options').onclick = function () {
    chrome.tabs.create({url: 'options.html'})
  }
})