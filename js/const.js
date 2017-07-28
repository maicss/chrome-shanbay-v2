const devMode = !('update_url' in chrome.runtime.getManifest())

const debugLogger = (level = 'log', ...msg) => {
  if (devMode) console[level](...msg)
}

// debugLogger 的兼容性写法, 箭头函数里面不能使用arguments
// const debugLogger = function(level) {
//   console[level].apply(window, [].slice.call(arguments, 1))
// }

const notify = (opt = {}) => {
  opt = {
    title: opt.title || '人丑多读书',
    message: opt.message || '少壮不努力，老大背单词',
    url: opt.url || 'https://www.shanbay.com/'
  }
  let hasNotified = false
  const options = {
    type: 'basic',
    title: opt.title,
    message: opt.message,
    iconUrl: '../images/icon_48.png'
  }
  let noteID = Math.random().toString(36)
  chrome.notifications.create(noteID, options, (notifyID) => {
    console.log(`notification [${notifyID}] was created`)
    hasNotified = true
  })
  chrome.notifications.onClicked.addListener(function (notifyID) {
    console.log(`notification [${notifyID}] was clicked`)
    chrome.notifications.clear(notifyID)
    if (noteID === notifyID) {
      chrome.tabs.create({
        url: opt.url
      })
    }
    hasNotified = false
  })
}

const request = (url, options = {}) => {
  return fetch(url, options).then(res => {
    if (res.ok) {
      if (options.type === 'buffer') return res.arrayBuffer()
      return res.json()
    } else {
      debugLogger('error', `[${new Date().toLocaleDateString()}] request failed ${options.method || 'GET'} ${url} ${JSON.stringify(res)}`)
      return Promise.reject(res)
    }
  }).catch(e => debugLogger('error', `[${new Date().toLocaleDateString()}] fetch failed ${options.method || 'GET'} ${url} ${JSON.stringify(e)}`))
}

const shanbayAPI = {
  userInfo: {
    method: 'GET',
    url: 'https://api.shanbay.com/account/?access_token='
  },
  lookUp: {
    method: 'GET',
    url: 'https://api.shanbay.com/bdc/search/?word={word}&access_token=',
    params: ['word']
  },
  add: {
    method: 'POST',
    url: 'https://api.shanbay.com/bdc/learning/?access_token=',
    params: ['id']
  },
  forget: {
    method: 'PUT',
    url: ' https://api.shanbay.com/bdc/learning/{learning_id}/?access_token=',
    params: [{forget: 1}]
  }
}

/**
 * localStorageSpecification 存放到localStorage的配置
 * 只存取第一个键值对
 * desc 是这个键值对的描述
 * enum 是这个键的取值范围
 * */
const extensionSpecification = [
  // {'content-sentence': false, desc: '是否显示例句', enum: [true, false]},
  {'clickLookup': true, desc: '双击选中查词', enum: [true, false]},
  {'contextLookup': true, desc: '右键查词', enum: [true, false]},
  {'addBook': false, desc: '默认添加到单词本', enum: [true, false]},
  {'alarm': true, desc: '定时提醒', enum: [true, false]},
  {'reminderContent': '少壮不努力，老大背单词', desc: '提示框内容',},
  {'autoRead': 'false', desc: '自动发音', enum: ['EN', 'US', 'false']},
  {'paraphrase': 'bilingual', desc: '默认释义', enum: ['Chinese', 'English', 'bilingual']}
]

const storageSettingArray = extensionSpecification.map(setting => {
  delete setting.enum
  delete setting.desc
  return setting
})

let storageSettingMap = {};
storageSettingArray.forEach(item => {
  Object.assign(storageSettingMap, item)
})

/**
 * 构造所有需要跟shanbay交互的方法
 * 所有的方法的返回值都是promise
 * */
const userInfo = (token) => {
  return request(shanbayAPI.userInfo.url + token)
}

const lookUp = (word, token) => {
  return request((shanbayAPI.lookUp.url + token).replace('{word}', word))
}
const addWord = (id, token) => {
  return request(shanbayAPI.add.url + token, {
    method: shanbayAPI.add.method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({id})
  })
}
const forget = (learningId, token) => {
  return request((shanbayAPI.forget.url + token).replace('{learning_id}', learningId), {
    method: shanbayAPI.forget.method
  })
}