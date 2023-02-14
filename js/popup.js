function renderUser () {
  const login = document.querySelector('#login')
  const batchAddBtn = document.querySelector('#batch-add')
  const learnBtn = document.querySelector('#begin-learning')
  const settingBtn = document.querySelector('#options')
  login.onclick = function () {
    chrome.tabs.create({
      url: 'https://web.shanbay.com/web/account/login/'
    })
  }

  chrome.runtime.sendMessage({
    action: 'getAuthInfo'
  }, auth => {
    console.log('popup get background auth info', auth)
    if (auth && auth.length) {
      login.className = 'hide'
      batchAddBtn.className = ''
      learnBtn.className = ''
      settingBtn.className = ''
    } else {
      login.className = ''
      batchAddBtn.className = 'hide'
      learnBtn.className = 'hide'
      settingBtn.className = 'hide'
    }
  })

}

document.addEventListener('DOMContentLoaded', function () {
  renderUser()
  document.querySelector('#batch-add').onclick = function () {
    chrome.tabs.create({ url: 'https://web.shanbay.com/wordsweb/#/collection' })
  }
  document.querySelector('#begin-learning').onclick = function () {
    chrome.tabs.create({ url: 'https://web.shanbay.com/wordsweb/#/collection' })
  }
  document.querySelector('#options').onclick = function () {
    chrome.tabs.create({ url: 'options.html' })
  }
})
