const devMode = !('update_url' in chrome.runtime.getManifest())

const debugLogger = (level = 'log', ...msg) => {
  if (devMode) console[level](...msg)
}

const request = (url, options) => {
  if (options) {
    options.method = options.method || 'GET'
  }
  return fetch(url, options).then(res => {
    if (res.ok) {
      return res.json()
    } else {
      debugLogger('error', `[${new Date().toLocaleDateString()}] request failed ${options.method} ${url} ${JSON.stringify(res)}`)
      return Promise.reject(res)
    }
  }).catch(e => debugLogger('error', `[${new Date().toLocaleDateString()}] fetch failed ${options.method} ${url} ${JSON.stringify(e)}`))
}

const shanbayAPI = {
  userInfo: {
    method: 'GET',
    url: 'https://api.shanbay.com/account/'
  },
  lookUp: {
    method: 'GET',
    url: 'https://api.shanbay.com/bdc/search/?word=',
    params: ['word']
  },
  add: {
    method: 'POST',
    url: 'https://api.shanbay.com/bdc/learning/',
    params: ['id']
  },
  forget: {
    method: 'PUT',
    url: ' https://api.shanbay.com/bdc/learning/{learning_id}/',
    params: [{forget: 1}]
  }
}

const localStorageSpecification = {
  click2find: {
    desc: '双击选中之后是否直接查询',
    default: true
  },
  defaultAddBook: {
    desc: '默认是否直接加入单词本',
    default: false
  },
  defaultPronounce: {
    desc: '是否默认查询时候发音',
    default: false,
    values: ['EN', 'US', false]
  }
}

/**
 * 构造所有需要跟shanbay交互的方法
 * 所有的方法的返回值都是promise
 * */
const userInfo = () => {
  return fetch(shanbayAPI.userInfo.url).then(res => {
    if (res.ok) {
      return res.json()
    } else {
      return Promise.reject(res)
    }
  }).catch(e => debugLogger('error', e))
}

const lookUp = (word) => {
  return fetch(shanbayAPI.lookUp.url + word).then(res => {
    if (res.ok) {
      return res.json()
    } else {
      return Promise.reject(res)
    }
  }).catch(e => (debugLogger('error', e)))
}
const add = (id) => {
  return fetch(shanbayAPI.add.url, {method: shanbayAPI.add.method, body: {id}}).then(res => {
    if (res.ok) {
      return res.json()
    } else {
      return Promise.reject(res)
    }
  }).catch(e => (debugLogger('error', e)))
}
const forget = (id) => {
  return fetch(shanbayAPI.forget.url, {method: shanbayAPI.forget.method, body: {id}}).then(res => {
    if (res.ok) {
      return res.json()
    } else {
      return Promise.reject(res)
    }
  }).catch(e => (debugLogger('error', e)))
}