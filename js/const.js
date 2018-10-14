
/**
 * @author maicss
 * @file some licences file
 * @copyright 2017-2018 maicss
 * */

/**
 * 全局设置对象
 * @type {object}
 * */
let storage = {}

/** 检测是否是开发模式，用来控制日志的输出
 * @type {boolean}
 * */

const devMode = !('update_url' in chrome.runtime.getManifest());

/**
 * 开发模式的log打印
 * @function debugLogger
 * @param {string} level=log 属于console的任何log的等级
 * @default log
 * @param {*} msg log信息
 * @summary 如果是任何情况下都要打印的信息，就用console，如果只是调试的信息，就用debugLogger
 * */
const debugLogger = (level = 'log', ...msg) => {
  if (devMode) console[level](...msg)
}

const notify = (opt = {}) => {
  /**
   * chrome 通知处理方法, 传入的参数就是chrome notifications的参数
   * @function notify
   * @param {object} opt={} - chrome notifications 的参数
   * @param {string} opt.title=人丑多读书 notifications title
   * @param {string} opt.message=少壮不努力，老大背单词 notifications message
   * @param {string} opt.url=https://www.shanbay.com/ notifications url, notifications可以点击跳转
   * */
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
    debugLogger('log', `notification [${notifyID}] was created`)
    hasNotified = true
  })
  chrome.notifications.onClicked.addListener(function (notifyID) {
    debugLogger('log', `notification [${notifyID}] was clicked`)
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
  /**
   * 基于fetch的网络请求方法的封装，只有两种数据的返回，buffer和json，因为这个应用里面只用到了这两种
   * @function request
   * @see [use fetch API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch}
   * @param {string} url - request url
   * @param {object} options - fetch options
   * @param {string} [options.type='buffer'] - whether need return buffer
   * @param {string} [options.credentials] - whether need cookies
   * @return Promise
  * */
  return fetch(url, options).then(res => {
    if (res.ok) {
      if (options.type === 'buffer') return res.arrayBuffer()
      return res.json()
    } else {
      if (res.status === 401) {
        notify({title: '扇贝网登录信息已过期', message: '请点击本通知或去扇贝网重新登录，否者将不能使用添加单词、右键查词和背单词提醒等功能。'})
      }
      debugLogger('error', `[${new Date().toLocaleDateString()}] request failed ${options.method || 'GET'} ${url} ${JSON.stringify(res)}`)
      return Promise.reject(res)
    }
  }).catch(e => debugLogger('error', `[${new Date().toLocaleDateString()}] fetch failed ${options.method || 'GET'} ${url} ${JSON.stringify(e)}`))
}

const neededCookieNames = ["csrftoken", "auth_token", "userid"]

const shanbayAPI = {
  /**
   * shanbay API的需要用到的方法，没什么用，只是一个参考
   * @constant
   * @readonly
   * @enum {object}
   * */

  /** 获取用户信息*/
  userInfo: {
    // 扇贝开放API关闭之后，直接读取扇贝网的cookie，使用扇贝私有API
    method: 'GET',
    url: 'https://www.shanbay.com/api/v1/common/user/'
  },
  /** 查询单词*/
  lookUp: {
    method: 'GET',
    url: 'https://api.shanbay.com/bdc/search/?word={word}&access_token=',
    params: ['word']
  },
  /** 添加一个单词到单词本*/
  add: {
    method: 'POST',
    url: 'https://api.shanbay.com/bdc/learning/?access_token=',
    params: ['id']
  },
  /** 重置一个单词的熟练度*/
  forget: {
    method: 'PUT',
    url: ' https://api.shanbay.com/bdc/learning/{learning_id}/?access_token=',
    params: [{forget: 1}]
  }
}

/**
 * 扩展设置的名称、名称的说明、取值范围的数组
 * @namespace {Array} extensionSpecification
 * @property {string} * - 各种名称
 * @property {string} desc - 名称的说明
 * @property {Array} enum - 取值范围
 * */
const extensionSpecification = [
  {'clickLookup': true, desc: '双击选中查词', enum: [true, false]},
  {'contextLookup': true, desc: '右键查词', enum: [true, false]},
  {'addBook': false, desc: '默认添加到单词本', enum: [true, false]},
  {'alarm': true, desc: '定时提醒', enum: [true, false]},
  {'reminderContent': '少壮不努力，老大背单词', desc: '提示框内容',},
  {'autoRead': 'false', desc: '自动发音', enum: ['EN', 'US', 'false']},
  {'paraphrase': 'bilingual', desc: '默认释义', enum: ['Chinese', 'English', 'bilingual']},
  {'avatar': true, desc: 'Github动态页面显示头像', enum: [true, false]},
  {'trend': true, desc: '添加Github trend导航', enum: [true, false]},
]
/**
 * 由extensionSpecification去除描述和取值范围之后生成的真正能使用的数组
 * a array of {settingName: value}
 * @type {Array}
 * @see extensionSpecification
 * */
const storageSettingArray = extensionSpecification.map(setting => {
  delete setting.enum
  delete setting.desc
  return setting
})

/**
 * 由storageSettingArray数组生成的map
 * @type {Object}
 * */
let storageSettingMap = {};
storageSettingArray.forEach(item => {
  Object.assign(storageSettingMap, item)
})


const userInfo = () => {
  /**
   * 获取用户信息
   * @function userInfo
   * @return {object} Promise
   * */
  return request(shanbayAPI.userInfo.url, {credentials: 'include'})
}

const lookUp = (word, token) => {
  /**
   * 查询单词
   * @function lookUp
   * @param {string} word - 需要查询的单词
   * @param {string} token - 用户token
   * @return {object} Promise
   * */
  return request((shanbayAPI.lookUp.url + token).replace('{word}', word))
}
const addWord = (id, token) => {
  /**
   * 添加单词
   * @function addWord
   * @param {number} id - 单词ID
   * @param {string} token - 用户token
   * @return {object} Promise
   * */
  return request(shanbayAPI.add.url + token, {
    method: shanbayAPI.add.method,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({id})
  })
}
const forget = (learningId, token) => {
  /**
   * 忘记单词
   * @function forget
   * @param {number} learningId - 单词的learningId
   * @param {string} token - 用户token
   * @return {object} Promise
   * */
  return request((shanbayAPI.forget.url + token).replace('{learning_id}', learningId), {
    method: shanbayAPI.forget.method,
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({forget: 1})
  })
}
