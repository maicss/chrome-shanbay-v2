(async () => {
  const src = chrome.runtime.getURL("js/const.js")
  const {debugLogger, storageSettingMap} = await import(src)

  const storage = {}
/** 当前选区的父级body
 * @type {DOM(body) | null}
 * */
let selectionParentBody = null
/** 根据选区位置得到的弹出框的位置
 * @type {object}
 * @enum {number}
 * */
let offset = null

/**
 * 从chrome的storage里获取存储的插件的设置，如果有值，就给storage赋值，否者就使用默认的storageSettingMap
 * */
chrome.storage.sync.get('__shanbayExtensionSettings', (settings) => {
  debugLogger('info', 'chrome storage loaded')
  if (Object.keys(settings).length) {
    settings.__shanbayExtensionSettings.forEach(item => {
      Object.assign(storage, item)
    })
  } else {
    Object.assign(storage, storageSettingMap)
  }
})

/**
 * 监听设置变化的事件，如果修改了设置，就更新全局的storage的值
 * */
chrome.storage.onChanged.addListener(function (changes) {
  debugLogger('info', 'chrome storage changed')
  changes.__shanbayExtensionSettings.newValue.forEach(item => {
    Object.assign(storage, item)
  })
})
  /**
   * 双击事件和右键选中后的事件处理器。
   * @function pendingSearchSelection
   * @param {object}[e] - 双击事件的对象
   * 兼容性: node.getRootNode: chrome 54+
   * */
const pendingSearchSelection = (e) => {

  const _popover = document.querySelector('#__shanbay-popover')
  if (_popover) return
  let _selection = getSelection()
  if (!_selection.rangeCount) return
  let _range = getSelection().getRangeAt(0)
  offset = getSelectionPosition(_range)
  if (e && storage.clickLookup) {
    selectionParentBody = e.target.getRootNode().body
    let matchResult = getSelection().toString().trim().match(/^[a-zA-Z\s']+$/)
    if (matchResult) {
      popover({loading: true, msg: '查询中....'})
      debugLogger('info', 'get word: ', matchResult[0])
      chrome.runtime.sendMessage({
        action: 'lookup',
        word: matchResult[0]
      })
    }
  } else {
    selectionParentBody = _range.startContainer.ownerDocument.body
  }

}

  /**
   * 根据参数和设置渲染弹出框，并处理弹出框上的各种事件
   * @function popover
   * @param {object} res
   * @param {boolean} [res.loading] - 查询前的准备状态和未登录的提示
   * @param {object} [res.data] - 查询结果
   * */
const popover = (res) => {
  /** 如果全局的父级body不存在，使用pendingSearchSelection查找父级body，是右键查询，非事件触发使用的*/
  if (!selectionParentBody) {
    pendingSearchSelection()
  }

  /** 先根据选区确定弹出框的位置，生成弹出框，然后根据参数和设置，往里面插入内容*/
  let html = `<div id="__shanbay-popover" style="top: ${offset.top}px; left: ${offset.left}px; display: block"><div id="shanbay-arrow" style= ${offset.distance ? 'left:' + offset.distance + 'px' : ''}></div><div id="shanbay-inner"><div id="shanbay-title" style="border: none;"></div></div></div>`

  /** 这里是为了防止多次调用popover产生多个弹出框的。因为一次查询最起码会调用两次popover*/
  if (!document.querySelector('#__shanbay-popover')) {
    selectionParentBody.insertAdjacentHTML('beforeEnd', html)
  }

  if (res.loading) {
    /** 查询之前和未登录的提示信息*/
    document.querySelector('#__shanbay-popover #shanbay-title').innerHTML = res.msg
  } else if (res.data.msg) {
    document.querySelector('#__shanbay-popover #shanbay-inner').innerHTML = `<div id="shanbay-title" class="has-error" style="border: none;">${res.data.msg}</div>`
  } else {
    /** 查询单词或者单词其他操作成功*/
    let data = res.data
    const assemblyPronunciationStr = () => {
      if (!data.audios.length) return ''
      let str = ''
      if (data.audios[0].uk ) {
        str += '<div>'
        str += `<span>uk: </span><small>/${data.audios[0].uk.ipa}/</small> `
        if (data.audios[0].uk.urls.length) str += `<span class="speaker" data-target="${data.audios[0].uk.urls[0]}"></span> `
        str += '</div>'
      }
      if (data.audios[0].us ) {
        str += '<div>'
        str += `<span>us: </span><small>/${data.audios[0].us.ipa}/</small> `
        if (data.audios[0].us.urls.length) str += `<span class="speaker" data-target="${data.audios[0].us.urls[0]}"></span> `
        str += '</div>'
      }
      return str
    }
    let contentHtml = `
      <div id="shanbay-title">
          <span class="word">${data.content}</span>
          <a class="check-detail" href="https://web.shanbay.com/wordsweb/#/detail/${data.id}" target="_blank"> 查看详情 </a>
          <div class="phonetic-symbols">${assemblyPronunciationStr()}</div>
      </div>
      <div id="shanbay-content">
          <div class="simple-definition">
              ${storage.paraphrase !== 'English' ? (data.definitions.cn.length ? `<div><strong>中文：</strong> ${data.definitions.cn.map(p => `<div><span>${p.pos} </span><span>${p.def}</span></div>`).join('')}</div>`: '') : ''}
              ${ storage.paraphrase !== 'Chinese' ? (data.definitions.en.length ? `<div><strong>英文：</strong>${data.definitions.en.map(p => `<div><span>${p.pos} </span><span>${p.def}</span></div>`).join('')}</div>`: '') : ''}
          </div>
          <div id="shanbay-example-sentence-div" class="hide"></div>
          <div id="footer">
            <span id="shanbay-example-sentence-span"><button id="shanbay-example-sentence-btn" class="shanbay-btn">查看例句</button></span>
            ${data.exists === 'error' ? '' : `<span id="shanbay-add-word-span"><button id="shanbay-add-word-btn" class="shanbay-btn ${data.exists ? 'forget' : ''}">${data.exists ? '我忘了' : '添加'}</button></span>`}
          </div>
      </div>
    `

    document.querySelector('#__shanbay-popover #shanbay-inner').innerHTML = contentHtml
    /** 各种事件的处理*/
    /** 发音事件的处理 */
    Array.from(document.querySelectorAll('#__shanbay-popover .speaker')).forEach((speaker) => {
      speaker.addEventListener('click', function () {
        chrome.runtime.sendMessage({action: 'playSound', url: this.dataset.target})
      })
    })
    const exampleSentenceBtn = document.querySelector('#shanbay-example-sentence-btn')
    const exampleSentenceSpan = document.querySelector('#shanbay-example-sentence-span')

    /** 添加单词和忘记单词的事件处理*/
    const addWordBtn = document.querySelector('#shanbay-add-word-btn')
    if (data.exists === true) {
      addWordBtn.addEventListener('click', function () {
        chrome.runtime.sendMessage({action: 'addOrForget', word: data.content, wordID: data.id})
      })
    } else if (data.exists === false){
      if (storage.addBook) {
        addWordBtn.className = 'hide'
        chrome.runtime.sendMessage({action: 'addOrForget', word: data.content, wordID: data.id})
      } else {
        addWordBtn.addEventListener('click', function () {
          chrome.runtime.sendMessage({action: 'addOrForget', word: data.content, wordID: data.id})
        })
      }
    }

    if (!storage.exampleSentence) {
      exampleSentenceSpan.interHtml = ''
    } else {
      exampleSentenceBtn.addEventListener('click', () => {
        chrome.runtime.sendMessage({action: 'getWordExample', id: data.id})
      })
    }

  }
}

/** 与 background 交互，返回信息的处理 */
chrome.runtime.onMessage.addListener(function (res, sender) {
  const addWordSpan = document.querySelector('#shanbay-add-word-span')
  const exampleSentenceDiv = document.querySelector('#shanbay-example-sentence-div')
  const exampleSentenceSpan = document.querySelector('#shanbay-example-sentence-span')
  switch (res.action) {
    case 'lookup':
      popover({loading: false, data: res.data})
      break
    case 'addOrForget':
      if (res.data.errors === 'SUCCESS') {
        addWordSpan.innerHTML = '添加失败'
      } else {
        addWordSpan.innerHTML = '添加成功'
      }
      break
    case 'getWordExample':
      exampleSentenceDiv.innerHTML = res.data.map((item, index) => `<p>${index + 1}, ${item.content_en} <span class="speaker" data-target="${item.audio.us.urls[0]}"></span></p><p>  ${item.content_cn}</p>`).join('')
      exampleSentenceDiv.className = 'simple-definition'
      exampleSentenceSpan.innerHTML = ''
      Array.from(exampleSentenceDiv.querySelectorAll('.speaker')).forEach(dom => {
        dom.addEventListener('click', function () {
          chrome.runtime.sendMessage({action: 'playSound', url: this.dataset.target})
        })
      })
      break
  }
})
  /**
   * 得到弹出框的绝对位置 和 弹出框箭头的位置
   * @function getSelectionPosition
   * @param {object} range Range的实例
   * @return {{left: number, top: number, distance: number}}
   * */
const getSelectionPosition = (range) => {

  /** 选区的范围数据*/
  let {left, top, height, width} = range.getBoundingClientRect()
  /** 280 是弹出框设置的宽度*/
  const popupWidth = 280
  // 这里的22px是为了和单词保持一定距离
  // popup 宽度为280px, 然后算上选区的宽度，让箭头置中
  let windowWidth = left + width
  left = left - (popupWidth - width) / 2
  top += (height + window.scrollY)
  // 处理单词靠边，popup 超出屏幕范围的情况
  // 140 是箭头原始的位置, 也就是popup宽度的一半
  let distance = 0
  if (left < 0) {
    distance = popupWidth / 2 + left
    left = 0
  } else if (left + popupWidth > window.innerWidth) {
    // 这里的10是为里防止右边边界出现的三角箭头出现在弹出框外面的情况，为了美观
    // 最终的效果就是单词在右边边界的时候，会跟浏览器的边框有一定的距离，因为排版的原因，右边可能空出一大截，而且不会对齐，但是浏览器左边肯定都是对齐的，所以弹出框在左边的时候，一定是靠在浏览器边界的。
    distance = popupWidth / 2 + (left + popupWidth - windowWidth) - 10
    left = windowWidth + 10 - popupWidth
  }
  return {left, top, distance}
}
  /**
   * 隐藏弹出框
   * @function hidePopover
   * @param {number} delay, ms 隐藏弹出框的延迟
   * */
const hidePopover = (delay) => {

  setTimeout(function () {
    selectionParentBody.removeChild(document.querySelector('#__shanbay-popover'))
    selectionParentBody = null
  }, delay || 0)
}

if (document.addEventListener || event.type === 'load' || document.readyState === 'complete') {
// document.addEventListener('DOMContentLoaded', function () {
  // console.log('Shanbay Extension DOMContentLoaded......')
  document.addEventListener('dblclick', pendingSearchSelection)
  document.addEventListener('click', function (e) {
    /** 屏蔽弹出框的双击事件*/
    const _popover = document.querySelector('#__shanbay-popover')
    if (_popover && selectionParentBody) {
      if (!e.composedPath().some(ele => ele === _popover)) {
        hidePopover()
      }
    }
  })
// })
}

})();