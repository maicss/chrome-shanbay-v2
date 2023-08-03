/**
 * @author maicss
 * @file some licences file
 * @copyright 2017-2020 maicss
 * */

/** 检测是否是开发模式，用来控制日志的输出
 * @type {boolean}
 * */
const devMode = !("update_url" in chrome.runtime.getManifest());

/** 解析每日需要复习单词接口返回的加密字符串。从源码里扒出来的  */
const decodeDailyTaskResponse = (encryptedString) => {
  const re_btou = new RegExp( ["[À-ß][-¿]", "[à-ï][-¿]{2}", "[ð-÷][-¿]{3}"].join("|"), "g" );
  const fromCharCode = String.fromCharCode;
  const cb_btou = function (t) {
    switch (t.length) {
      case 4:
        const e =
          (((7 & t.charCodeAt(0)) << 18) |
            ((63 & t.charCodeAt(1)) << 12) |
            ((63 & t.charCodeAt(2)) << 6) |
            (63 & t.charCodeAt(3))) -
          65536;
        return (
          fromCharCode(55296 + (e >>> 10)) + fromCharCode(56320 + (1023 & e))
        );
      case 3:
        return fromCharCode(
          ((15 & t.charCodeAt(0)) << 12) |
            ((63 & t.charCodeAt(1)) << 6) |
            (63 & t.charCodeAt(2))
        );
      default:
        return fromCharCode(
          ((31 & t.charCodeAt(0)) << 6) | (63 & t.charCodeAt(1))
        );
    }
  };
  const btou = (t) => t.replace(re_btou, cb_btou);
  const _decode = (t) => btou(atob(t));
  const checkVersionI = (string) => {
    const e = string.charCodeAt();
    return 65 <= e ? e - 65 : e - 65 + 41;
  };
  const checkVersion = (string) =>
    ((32 * checkVersionI(string[0]) + checkVersionI(string[1])) *
      checkVersionI(string[2]) +
      checkVersionI(string[3])) %
      32 <=
    1;
  const decode = (string) =>
    _decode(
      String(string)
        .replace(/[-_]/g, function (t) {
          return "-" == t ? "+" : "/";
        })
        .replace(/[^A-Za-z0-9\+\/]/g, "")
    );

  class f {
    _char = ".";
    _children = {};

    getChar() {
      return this._char;
    }

    getChildren() {
      return this._children;
    }

    setChar(t) {
      this._char = t;
    }
    setChildren(t, e) {
      this._children[t] = e;
    }
  }

  class m {
    static get(t) {
      return t >>> 0;
    }

    static xor(t, e) {
      return this.get(this.get(t) ^ this.get(e));
    }

    static and(t, e) {
      return this.get(this.get(t) & this.get(e));
    }

    static mul(t, e) {
      const r = ((4294901760 & t) >>> 0) * e;
      const n = (65535 & t) * e;
      return this.get((r >>> 0) + (n >>> 0));
    }

    static or(t, e) {
      return this.get(this.get(t) | this.get(e));
    }

    static not(t) {
      return this.get(~this.get(t));
    }

    static shiftLeft(t, e) {
      return this.get(this.get(t) << e);
    }

    static shiftRight(t, e) {
      return this.get(t) >>> e;
    }
    static mod(t, e) {
      return this.get(this.get(t) % e);
    }
  }

  class n {
    static loop(number, handler) {
      return "v"
        .repeat(number)
        .split("")
        .map((index, val) => handler(val));
    }
  }

  class o {
    _status = [];
    _mat1 = 0;
    _mat2 = 0;
    _tmat = 0;

    seed(e) {
      n.loop(4, (t) => {
        e.length > t
          ? (this._status[t] = m.get(e.charAt(t).charCodeAt()))
          : (this._status[t] = m.get(110));
      }),
        (this._mat1 = this._status[1]),
        (this._mat2 = this._status[2]),
        (this._tmat = this._status[3]),
        this._init();
    }

    _next_state() {
      let e = this._status[3];
      let t = m.xor(
        m.and(this._status[0], 2147483647),
        m.xor(this._status[1], this._status[2])
      );
      (t = m.xor(t, m.shiftLeft(t, 1))),
        (e = m.xor(e, m.xor(m.shiftRight(e, 1), t))),
        (this._status[0] = this._status[1]),
        (this._status[1] = this._status[2]),
        (this._status[2] = m.xor(t, m.shiftLeft(e, 10))),
        (this._status[3] = e),
        (this._status[1] = m.xor(
          this._status[1],
          m.and(-m.and(e, 1), this._mat1)
        )),
        (this._status[2] = m.xor(
          this._status[2],
          m.and(-m.and(e, 1), this._mat2)
        ));
    }

    generate(t) {
      this._next_state();
      let e,
        r = void 0;
      return (
        (r = this._status[3]),
        (e = m.xor(this._status[0], m.shiftRight(this._status[2], 8))),
        (r = m.xor(r, e)),
        (r = m.xor(m.and(-m.and(e, 1), this._tmat), r)) % t
      );
    }

    _init() {
      n.loop(7, (t) => {
        this._status[(t + 1) & 3] = m.xor(
          this._status[(t + 1) & 3],
          t +
            1 +
            m.mul(
              1812433253,
              m.xor(this._status[3 & t], m.shiftRight(this._status[3 & t], 30))
            )
        );
      }),
        0 == (2147483647 & this._status[0]) &&
          0 === this._status[1] &&
          0 === this._status[2] &&
          0 === this._status[3] &&
          ((this._status[0] = 66),
          (this._status[1] = 65),
          (this._status[2] = 89),
          (this._status[3] = 83)),
        n.loop(8, this._next_state.bind(this));
    }
  }

  class a {
    s = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    c = [1, 2, 2, 2, 2, 2];

    constructor() {
      this._random = new o()
      this._sign = ""
      this._inter = {}
      this._head = new f()
    }
    init(string) {
      this._random.seed(string)
      this._sign = string
      n.loop(64, (t) => {
        this._addSymbol(
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"[
            t
          ],
          this.c[parseInt((t + 1) / 11)]
        );
      })
      this._inter["="] = "="
    }

    _addSymbol(t, e) {
      var r = this, head = this._head,  o = "";
      return (
        n.loop(e, (t) => {
          for (let e = this.s[r._random.generate(32)]; e in head.getChildren() && "." !== head.getChildren()[e].getChar();)
            e = r.s[r._random.generate(32)];
          (o += e),
            e in head.getChildren() || head.setChildren(e, new f()),
            (head = head.getChildren()[e]);
        }),
        head.setChar(t), (this._inter[t] = o)
      );
    }

    decode(t) {
      for (let e = "", r = 4; r < t.length; )
        if ("=" !== t[r]) {
          for (let n = this._head; t[r] in n.getChildren(); )
            (n = n.getChildren()[t[r]]), r++;
          e += n.getChar();
        } else (e += "="), r++;
      return e;
    }
  }
  if (checkVersion(encryptedString)) {
    const e = new a();
    e.init(encryptedString.substr(0, 4));
    const r = e.decode(encryptedString);
    return decode(r)
  } else {
    debugLogger('error', 'Daily task check version failed', encryptedString)
    return {total: 0}
  }
};

/**
 * 开发模式的log打印
 * @function debugLogger
 * @param {string} 属于console的任何log的等级
 * @param {*} msg log信息
 * @summary 如果是任何情况下都要打印的信息，就用console，如果只是调试的信息，就用debugLogger
 * */
export const debugLogger = (level, ...msg) => {
  if (devMode) console[level](...msg);
};

/**
 * chrome 通知处理方法, 传入的参数就是chrome notifications的参数
 * @function notify
 * @param {object} opt - chrome notifications 的参数
 * @param {string} opt.title=人丑多读书 - notifications title
 * @param {string} [opt.message=少壮不努力，老大背单词] - notifications message
 * @param {string} [opt.url=https://www.shanbay.com/] - notifications url, notifications可以点击跳转
 * */
export const notify = (opt = {title: '人丑多读书', message: '少壮不努力，老大背单词', url: 'https://www.shanbay.com/'}) => {
  const options = {
    type: "basic",
    title: opt.title,
    message: opt.message,
    iconUrl: "../images/icon_48.png",
  };
  let noteID = Math.random().toString(36);
  chrome.notifications.create(noteID, options);
  chrome.notifications.onClicked.addListener(function (notifyID) {
    debugLogger("log", `notification [${notifyID}] was clicked`);
    chrome.notifications.clear(notifyID);
    if (noteID === notifyID) {
      chrome.tabs.create({
        url: opt.url,
      });
    }
  });
};

/**
 * 基于fetch的网络请求方法的封装，只有两种数据的返回，buffer和json，因为这个应用里面只用到了这两种
 * @function request
 * @see [use fetch API]{@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch}
 * @param {string} url - request url
 * @param {object} [options] - fetch options
 * @param {string} [options.type='buffer'] - whether need return buffer
 * @return Promise
 * */
export const request = (url, options = {}) => {
  return fetch(url, Object.assign(options, { credentials: "include" }))
    .then((res) => {
      if (res.ok) {
        if (options.type === "buffer") return res.arrayBuffer();
        return res.json();
      } else {
        const promise = res.json ? res.json() : res.text();
        return promise.then((r) =>
          Promise.reject({ status: res.status, ...r })
        );
      }
    }
  );
};

/**
 * 扇贝API
 * @constant
 * @readonly
 * @enum {object}
 * */
const shanbayAPI = {
  /** 查询单词*/
  lookUp: {
    method: "GET",
    url: "https://apiv3.shanbay.com/abc/words/senses?vocabulary_content={word}",
    params: ["word"],
  },
  wordCheck: {
    method: "GET",
    url: "https://apiv3.shanbay.com/wordscollection/words_check?vocab_ids={id}",
    params: ["id"],
  },
  wordExample: {
    method: "GET",
    url: "https://apiv3.shanbay.com/abc/words/vocabularies/{id}/examples",
    params: ["id"],
  },
  /** 添加生词和标记已添加生词已忘记 */
  addOrForget: {
    method: "POST",
    url: "https://apiv3.shanbay.com/news/words",
    params: {"vocab_id":"","business_id":2,"paragraph_id":"1","sentence_id":"A1","source_content":"","article_id":"ca","source_name":"","summary":""}
  },
  // 今日需要复习
  dailyReview: {
    method: "GET",
    url: "https://apiv3.shanbay.com/wordscollection/learning/words/today_learning_items?page=1&type_of=REVIEW&ipp=10",
  },
};

/**
 * 扩展设置的名称、名称的说明、取值范围的数组
 * @namespace {Array} extensionSpecification
 * @property {string} * - 各种名称
 * @property {string} desc - 名称的说明
 * @property {Array} enum - 取值范围
 * */
const extensionSpecification = [
  {clickLookup: true, desc: "双击选中查词",  enum: [true, false], type: "radio"},
  {contextLookup: true, desc: "右键查词", enum: [true, false], type: "radio"},
  {addBook: false, desc: "默认添加到单词本", enum: [true, false], type: "radio"},
  {alarm: true, desc: "定时提醒", enum: [true, false], type: "radio"},
  {reminderContent: '少壮不努力，老大背单词', desc: '提示框内容', type: 'text'},
  {autoRead: "false", desc: "自动发音", enum: ["EN", "US", "false"], type: "select"},
  {paraphrase: "bilingual", desc: "默认释义", enum: ["Chinese", "English", "bilingual"], type: "select"},
  {exampleSentence: true, desc: "显示例句按钮", enum: [true, false], type: "select"},
  { ignoreSites: [], desc: "忽略站点", type: "textarea" },
];
// 默认屏蔽的网站
export const defaultIgnoreSites = ["shanbay.com", "hjenglish.com", "codepen.io", "jsfiddle.net", "jsbin.com", "codesandbox.io", "github1s.com"];
/**
 * 由extensionSpecification去除描述和取值范围之后生成的真正能使用的数组
 * a array of {settingName: value}
 * @type {Array}
 * @see extensionSpecification
 * */
export const storageSettingArray = extensionSpecification.map((setting) => {
  delete setting.enum;
  delete setting.desc;
  return setting;
});

/**
 * 由storageSettingArray数组生成的map
 * @type {Object}
 * */
export let storageSettingMap = {};
storageSettingArray.forEach((item) => {
  Object.assign(storageSettingMap, item);
});

/**
 * @description 查询单词
 * @function lookUp
 * @param {string} word - 需要查询的单词
 * @return Promise<object>
 * */
export const lookUp = word => request((shanbayAPI.lookUp.url).replace('{word}', word), {method: shanbayAPI.wordExample.method})

export const checkWordAdded = wordID => request(shanbayAPI.wordCheck.url.replace('{id}', wordID), {method: shanbayAPI.wordExample.method})

export const getWordExampleSentence = wordID => request(shanbayAPI.wordExample.url.replace('{id}', wordID), {method: shanbayAPI.wordExample.method})

/**
 * @description 添加单词到单词本或忘记单词
 * @param {string} word - 单词
 * @param {string} wordID - 单词id
 * @return Promise<object>
 */
export const addOrForget = (word, wordID) => request(shanbayAPI.addOrForget.url, {
    method: shanbayAPI.addOrForget.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({"article_id":"","business_id":2,"vocab_id":wordID,"paragraph_id":"","sentence_id":"","source_content":"","source_name":"","summary":word}),
  });

export const getDailyTaskCount = () =>
  request(shanbayAPI.dailyReview).then(decodeDailyTaskResponse);
