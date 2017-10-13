const prefix = 'https://api.github.com/search/users?q='
const actionArr = ['starred', 'created', 'forked', 'watched', 'follow']


/** add Github tends*/

const addTends = () => {
  // const tendUrl = 'https://github.com/trending'
  const ul = document.querySelector('header.Header ul[role=navigation]')
    if (ul) ul.insertAdjacentHTML('beforeEnd', '<li><a class="js-selected-navigation-item HeaderNavlink px-2" href="/trending">Trending</a></li>')
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

  if (storage.avatar && (location.href === 'https://github.com' || location.href === 'https://github.com/')) {
    addTends()
  }
})

