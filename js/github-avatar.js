const prefix = 'https://api.github.com/search/users?q='
const actionArr = ['starred', 'created', 'forked', 'watched', 'follow']


/** add Github tends*/

const addTends = () => {
  // const tendUrl = 'https://github.com/trending'
  const ul = document.querySelector('header.Header ul[role=navigation]')
    if (ul) ul.insertAdjacentHTML('beforeEnd', '<li><a class="js-selected-navigation-item HeaderNavlink px-2" href="/trending">Trending</a></li>')
}
/**
 * GitHub 动态首页添加头像
 * @param {Array<nodes>} a - 所有用户的链接
* */
const addAvatar = (a) => {
  const allA = a || document.querySelectorAll('div.alert.simple a')
  if (allA.length) {
    const usernameArr = Array.from(new Set([].map.call(allA, a => new URL(a.href).pathname.split('/')[1])))
    let requestUrl = prefix
    requestUrl += usernameArr.map(user => 'user:' + user).join('+')
    requestUrl += '&per_page=' + usernameArr.length
    request(requestUrl).then(res => {
      const userMap = {}
      res.items.forEach(item => userMap[item.login] = item.avatar_url + '&s=40');
      [].forEach.call(allA, a => {
        let _user = new URL(a.href).pathname.split('/')[1]
        a.insertAdjacentHTML('afterBegin', `<img src="${userMap[_user]}" style="border-radius: 2px; vertical-align: middle;margin-right: 4px;" width="20"/>`)
      })
    })
  }
}

/**
 * 从chrome的storage里获取存储的插件的设置，如果有值，就给storage赋值，否者就使用默认的storageSettingMap
 * */
chrome.storage.sync.get('chromeShanbaySettings', (settings) => {
  debugLogger('info', 'chrome storage loaded')
  if (Object.keys(settings).length) {
    settings.chromeShanbaySettings.forEach(item => {
      Object.assign(storage, item)
    })
  } else {
    storage = storageSettingMap
  }
  if (storage.trend) {
    addTends()
  }

  if (storage.avatar && (location.href === 'https://github.com' || location.href === 'https://github.com/')) {
    addAvatar()

    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        console.log(mutation.addedNodes)
        if (mutation.addedNodes.length) {
          let divs = [].filter.call(mutation.addedNodes, node => node.localName === 'div' && node.classList.contains(('alert')))
          let as = []
          divs.forEach(div => as.push(...div.querySelectorAll('a')))
          addAvatar(as)
        }
      })
    })

    observer.observe(document.querySelector('div.news'), {childList: true})

  }
})

