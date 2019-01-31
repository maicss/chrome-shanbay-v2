const bg = chrome.extension.getBackgroundPage()

function renderUser () {
  const login = document.querySelector('#login')

  bg.__shanbayExtensionAuthInfo.checkAuth(function (auth) {
    if (auth) {
      const batchAddBtn = document.querySelector('#batch-add')
      const learnBtn = document.querySelector('#begin-learning')
      const settingBtn = document.querySelector('#options')
      batchAddBtn.className = ''
      learnBtn.className = ''
      settingBtn.className = ''
    } else {
      login.className = ''
      login.querySelector('a').onclick = function () {
        chrome.tabs.create({
          url: 'https://web.shanbay.com/web/account/login/'
        })
      }
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
    chrome.tabs.create({ url: 'https://www.shanbay.com/bdc/vocabulary/add/batch/' })
  }
  document.querySelector('#begin-learning').onclick = function () {
    chrome.tabs.create({ url: 'https://www.shanbay.com/bdc/review/' })
  }
  document.querySelector('#options').onclick = function () {
    chrome.tabs.create({ url: 'options.html' })
  }
})