/** add Github Trending*/
const addTends = () => {
  const ul = document.querySelector('header.Header ul')
    if (ul) ul.insertAdjacentHTML('beforeEnd', '<li><a class="js-selected-navigation-item HeaderNavlink px-0 py-2" href="/trending">Trending</a></li>')
}


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

/**
 * 监听设置变化的事件，如果修改了设置，就更新全局的storage的值
 * */
chrome.storage.onChanged.addListener(function (changes) {
  debugLogger('info', 'chrome storage changed')
  storage = {}
  changes.chromeShanbaySettings.newValue.forEach(item => {
    Object.assign(storage, item)
  })
})

const pendingSearchSelection = (e) => {
  /**
   * 双击事件和右键选中后的事件处理器。
   * @function pendingSearchSelection
   * @param {object}[e] - 双击事件的对象
   * 兼容性: node.getRootNode: chrome 54+
   * */
  const _popover = document.querySelector('#shanbay-popover')
  if (_popover) {
    return
  }
  let _selection = getSelection()
  if (!_selection.rangeCount) return
  let _range = getSelection().getRangeAt(0)
  offset = getSelectionPosition(_range)
  if (e && storage.clickLookup) {
    selectionParentBody = e.target.getRootNode().body
    let matchResult = getSelection().toString().trim().match(/^[a-zA-Z\s']+$/)
    if (matchResult) {
      popover({
        loading: true,
        msg: '查询中....（请确保已登录<a href="https://www.shanbay.com/">扇贝网</a>）'
      })
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

const popover = (res) => {
  /**
   * 根据参数和设置渲染弹出框，并处理弹出框上的各种事件
   * @function popover
   * @param {object} res
   * @param {boolean} [res.loading] - 查询前的准备状态和未登录的提示
   * @param {object} [res.data] - 查询结果
   * */
  /** 如果全局的父级body不存在，使用pendingSearchSelection查找父级body，是右键查询，非事件触发使用的*/
  if (!selectionParentBody) {
    pendingSearchSelection()
  }

  /** 先根据选区确定弹出框的位置，生成弹出框，然后根据参数和设置，往里面插入内容*/
  let html = `<div id="shanbay-popover" style="top: ${offset.top}px; left: ${offset.left}px; display: block"><div id="shanbay-arrow" style= ${offset.distance ? 'left:' + offset.distance + 'px' : ''}></div><div id="shanbay-inner"><div id="shanbay-title" style="border: none;"></div></div></div>`

  /** 这里是为了防止多次调用popover产生多个弹出框的。因为一次查询最起码会调用两次popover*/
  if (!document.querySelector('#shanbay-popover')) {
    selectionParentBody.insertAdjacentHTML('beforeEnd', html)
  }

  if (res.loading) {
    /** 查询之前和未登录的提示信息*/
    document.querySelector('#shanbay-popover #shanbay-title').innerHTML = res.msg
  } else if (res.status_code === 0) {
    /** 查询单词或者单词其他操作成功*/
    let data = res.data
    let contentHtml = `
<div id="shanbay-title">
    <span class="word">${data.content}</span>
    <a href="https://www.shanbay.com/bdc/vocabulary/${data.id}" style="float: right;" target="_blank"> 详细</a>
    <div>
        
        ${data.pronunciations.uk ? `<span>uk: </span><small>/${data.pronunciations.uk}/</small>
        <span class="speaker" data-target="${data.uk_audio}"></span>` : ''}
        
        ${data.pronunciations.us ? `<span>us: </span><small>/${data.pronunciations.us}/</small>
        <span class="speaker" data-target="${data.us_audio}"></span>` : ''}
        
    </div>
</div>
<div id="shanbay-content">
    <div class="simple-definition">
        ${storage.paraphrase !== 'English' ? (data.cn_definition.pos ? `<div><strong>${data.cn_definition.pos} </strong><span>${data.cn_definition.defn}</span></div>` : data.cn_definition.defn ? data.cn_definition.defn.split('\n').join('<br>') : '' ) : ''}
        ${ storage.paraphrase !== 'Chinese' ? Object.keys(data.en_definitions).map(pos => `<div><span>${pos}. </span><span>${data.en_definitions[pos].join(';')}</span></div>`).join('') : ''}
    </div>
    <div class="add">
        ${data.learning_id ? `<p id="shanbay-forget-word"><button class="forget shanbay-btn">我忘了</button></p>` : `<p><button id="shanbay-add-word" class="shanbay-btn">添加</button></p>`}
        <p class="hide" id="shanbay-under-adding"><span class="loading">正在添加</span></p>
    </div>
    <div id="shanbay-add-result" class="hide"></div>
</div>
  `

    document.querySelector('#shanbay-popover #shanbay-inner').innerHTML = contentHtml;

    /** 各种事件的处理*/
    /** 发音事件的处理 */
    [].forEach.call(document.querySelectorAll('#shanbay-popover .speaker'), (speaker) => {
      speaker.addEventListener('click', function () {
        chrome.runtime.sendMessage({action: 'playSound', url: this.dataset.target})
      })
    })

    /** 添加单词和忘记单词的事件处理*/
    if (data.learning_id) {
      document.querySelector('#shanbay-forget-word').addEventListener('click', function () {
        chrome.runtime.sendMessage({action: 'forgetWord', learningId: data.learning_id})
      })
    } else {
      if (storage.addBook) {
        document.querySelector('#shanbay-add-word').className = 'hide'
        document.querySelector('#shanbay-under-adding').className = ''
        chrome.runtime.sendMessage({action: 'addWord', id: data.id})
      } else {
        document.querySelector('#shanbay-add-word').addEventListener('click', function () {
          document.querySelector('#shanbay-add-word').className = 'hide'
          document.querySelector('#shanbay-under-adding').className = ''
          chrome.runtime.sendMessage({action: 'addWord', id: data.id})
        })
      }
    }

  } else if (res.status_code === 1) {
    /** 查询单词或单词的其他操作失败*/
    // 查询正常，但是没有这个单词
    document.querySelector('#shanbay-popover #shanbay-inner').innerHTML = '<div id="shanbay-title" style="border: none;">没有找到这个单词</div>'
  } else {
    /** 未预料的状态*/
    let m = '哇塞，非常罕见的错误哎，请 <a href="https://github.com/maicss/chrome-shanbay-v2/issues">告诉我</a>你怎么发现这个错误的。我会尽快处理的，嗯嗯。'
    document.querySelector('#shanbay-popover #shanbay-title').innerHTML = m
    console.error(m, JSON.stringify(res))
  }
}

/** 与background 交互，返回信息的处理*/
chrome.runtime.onMessage.addListener(function (res, sender) {
  let addResult
  switch (res.action) {
    case 'lookup':
      popover(res.data)
      break
    case 'addWord':
      document.querySelector('#shanbay-under-adding').className = 'hide'
      addResult = document.querySelector('#shanbay-add-result')
      addResult.className = ''
      if (res.data.msg === 'SUCCESS') {
        addResult.innerHTML = `成功加入生词库！`
      } else {
        addResult.innerHTML = '单词添加失败，请重试'
      }
      break
    case 'forgetWord':
      document.querySelector('#shanbay-forget-word').className = 'hide'
      addResult = document.querySelector('#shanbay-add-result')
      addResult.className = ''
      if (res.data.msg === 'SUCCESS') {
        addResult.innerHTML = `成功加入生词库！`
      } else {
        addResult.innerHTML = '单词添加失败，请重试'
      }
      break
  }
})

const getSelectionPosition = (range) => {
  /**
   * 得到弹出框的绝对位置 和 弹出框箭头的位置
   * @function getSelectionPosition
   * @param {object} range Range的实例
   * @example
   * return {left: 100, top: 100, distance: 10}
   * @return {object<string:number>} left, top 弹出框的位置; distance, 箭头的偏移量
   * */
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
    // 这里的10是为里防止右边边界出现的三角箭头出现在弹出框外面的情况，纯粹为了美观
    // 最终的效果就是单词在右边边界的时候，会跟浏览器的边框有一定的距离，因为排版的原因，右边可能空出一大截，而且不会对齐，但是浏览器左边肯定都是对齐的，所以弹出框在左边的时候，一定是靠在浏览器边界的。
    distance = popupWidth / 2 + (left + popupWidth - windowWidth) - 10
    left = windowWidth + 10 - popupWidth
  }
  return {left, top, distance}
}

const hidePopover = (delay) => {
  /**
   * 隐藏弹出框
   * @function hidePopover
   * @param {number} delay, ms 隐藏弹出框的延迟
   * */
  setTimeout(function () {
    selectionParentBody.removeChild(document.querySelector('#shanbay-popover'))
    selectionParentBody = null
  }, delay || 0)
}

if (document.addEventListener || event.type === 'load' || document.readyState === 'complete') {
// document.addEventListener('DOMContentLoaded', function () {
  console.log('Shanbay Extension DOMContentLoaded......')
  document.addEventListener('dblclick', pendingSearchSelection)
  document.addEventListener('click', function (e) {
    /** 屏蔽弹出框的双击事件*/
    const _popover = document.querySelector('#shanbay-popover')
    if (_popover && selectionParentBody) {
      if (!e.path.some(ele => ele === _popover)) {
        hidePopover()
      }
    }
  })
// })
}
