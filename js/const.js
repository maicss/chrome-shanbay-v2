/**
 * @author maicss
 * @file some licences file
 * @copyright 2017-2020 maicss
 * */

/** 检测是否是开发模式，用来控制日志的输出
 * @type {boolean}
 * */
const devMode = !('update_url' in chrome.runtime.getManifest())

/**
 * 开发模式的log打印
 * @function debugLogger
 * @param {string} level=log 属于console的任何log的等级
 * @default log
 * @param {*} msg log信息
 * @summary 如果是任何情况下都要打印的信息，就用console，如果只是调试的信息，就用debugLogger
 * */
export const debugLogger = (level = 'log', ...msg) => {
  if (devMode) console[level](...msg)
}

/**
 * chrome 通知处理方法, 传入的参数就是chrome notifications的参数
 * @function notify
 * @param {object} opt - chrome notifications 的参数
 * @param {string} opt.title=人丑多读书 - notifications title
 * @param {string} [opt.message=少壮不努力，老大背单词] - notifications message
 * @param {string} [opt.url=https://www.shanbay.com/] - notifications url, notifications可以点击跳转
 * */
const notify = (opt = {title: '人丑多读书', message: '少壮不努力，老大背单词', url: 'https://www.shanbay.com/'}) => {
  let hasNotified = false
  const options = {
    type: 'basic',
    title: opt.title,
    message: opt.message,
    iconUrl: '../images/icon_48.png',
  }
  let noteID = Math.random().toString(36)
  chrome.notifications.create(noteID, options, (notifyID) => {
    // debugLogger('log', `notification [${notifyID}] was created`)
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

/**
 * 基于fetch的网络请求方法的封装，只有两种数据的返回，buffer和json，因为这个应用里面只用到了这两种
 * @function request
 * @see [use fetch API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch}
 * @param {string} url - request url
 * @param {object} [options] - fetch options
 * @param {string} [options.type='buffer'] - whether need return buffer
 * @return Promise
 * */
const request = (url, options = {}) => {
  options = Object.assign(options, { credentials: 'include' })
  return fetch(url, options)
    .then(res => {
      if (res.ok) {
        if (options.type === 'buffer') return res.arrayBuffer()
        return res.json()
      } else if (res.status === 401) {
        notify({ title: '扇贝网登录信息已过期', message: '请点击本通知或去扇贝网重新登录，否者将不能使用添加单词、右键查词和背单词提醒等功能。', url: 'https://web.shanbay.com/web/account/login/' })
        debugLogger('error', `[${new Date().toLocaleDateString()}] request failed ${options.method || 'GET'} ${url} ${JSON.stringify(res)}`)
        return Promise.reject({status: 401})
      } else {
        return Promise.reject(res.json ? res.json() : res.text())
      }
    })
    // .catch(e => debugLogger('error', `[${new Date().toLocaleDateString()}] fetch failed ${options.method || 'GET'} ${url} ${JSON.stringify(e)}`))
    .catch(e => {
      if (e.status === 400) {
        notify({
          title: '扇贝认证失败',
          message: '点击此消息登录',
          url: 'https://web.shanbay.com/web/account/login/'
        })
      } else {
        return e.then ? e.then(error => Promise.reject(error)) : Promise.reject(e)
      }
    })
}

/**
 * shanbay API的需要用到的方法，没什么用，只是一个参考
 * 扇贝开放API关闭之后，直接读取扇贝网的cookie，使用扇贝私有API
 * @constant
 * @readonly
 * @enum {object}
 * */
const shanbayAPI = {

  /**检查用户有效性*/
  // validUser: {
  //   method: ''
  // },
  /** 查询单词*/
  lookUp: {
    method: 'GET',
    url: 'https://apiv3.shanbay.com/abc/words/senses?vocabulary_content={word}',
    params: ['word']
  },
  wordCheck: {
    method: 'GET',
    url: 'https://apiv3.shanbay.com/wordscollection/words_check?vocab_ids={id}',
    params: ['id']
  },
  wordExample: {
    method: 'GET',
    url: 'https://apiv3.shanbay.com/abc/words/vocabularies/{id}/examples',
    params: ['id']
  },
  /** 添加生词和标记已添加生词已忘记 */
  addOrForget: {
    method: 'POST',
    url: 'https://apiv3.shanbay.com/news/words',
    params: [{"vocab_id":"","business_id":2,"paragraph_id":"1","sentence_id":"A1","source_content":"","article_id":"ca","source_name":"","summary":""}]
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
  { 'clickLookup': true, desc: '双击选中查词', enum: [true, false] },
  { 'contextLookup': true, desc: '右键查词', enum: [true, false] },
  { 'addBook': false, desc: '默认添加到单词本', enum: [true, false] },
  { 'alarm': true, desc: '定时提醒', enum: [true, false] },
  { 'reminderContent': '少壮不努力，老大背单词', desc: '提示框内容', },
  { 'autoRead': 'false', desc: '自动发音', enum: ['EN', 'US', 'false'] },
  { 'paraphrase': 'bilingual', desc: '默认释义', enum: ['Chinese', 'English', 'bilingual'] },
  { 'exampleSentence': true, desc: '显示例句按钮', enum: [true, false] },
]
/**
 * 由extensionSpecification去除描述和取值范围之后生成的真正能使用的数组
 * a array of {settingName: value}
 * @type {Array}
 * @see extensionSpecification
 * */
export const storageSettingArray = extensionSpecification.map(setting => {
  delete setting.enum
  delete setting.desc
  return setting
})

/**
 * 由storageSettingArray数组生成的map
 * @type {Object}
 * */
export let storageSettingMap = {}
storageSettingArray.forEach(item => {
  Object.assign(storageSettingMap, item)
})

/**
 * @description 查询单词
 * @function lookUp
 * @param {string} word - 需要查询的单词
 * @return Promise<object>
 * */
const lookUp = word => request((shanbayAPI.lookUp.url).replace('{word}', word), {method: shanbayAPI.wordExample.method})

const checkWordAdded = wordID => request(shanbayAPI.wordCheck.url.replace('{id}', wordID), {method: shanbayAPI.wordExample.method})

const getWordExampleSentence = wordID => request(shanbayAPI.wordExample.url.replace('{id}', wordID), {method: shanbayAPI.wordExample.method})

/** 
 * @description 添加单词到单词本或忘记单词
 * @param {string} word - 单词
 * @param {string} wordID - 单词id
 * @return Promise<object>
 */
const addOrForget = (word, wordID) => request(shanbayAPI.addOrForget.url, {
  method: shanbayAPI.addOrForget.method,
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({"vocab_id": wordID,"business_id":2,"paragraph_id":"1","sentence_id":"A1","source_content":"","article_id":"ca","source_name":"","summary": word})
})
