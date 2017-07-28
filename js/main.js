let selectionParentBody = null
let offset = null
let storage = {}

//
const getTodayTask = () => {
  /**
   * 每小时检测一下今天的剩余单词数量
   * 必须登录扇贝之后才可以使用
   * @return number word-last-number
   * */
  let taskTimer
  taskTimer = setInterval(function () {
    if (!storage.alarm && taskTimer) {
      clearInterval(taskTimer)
    } else {
      chrome.runtime.sendMessage({
        action: 'todayTask'
      })
    }
  }, 1000 * 60 * 60 * 3)

}

getTodayTask()

chrome.storage.sync.get('chromeShanbaySettings', (settings) => {
  debugLogger('info', 'chrome storage loaded')
  if (Object.keys(settings).length) {
    settings.chromeShanbaySettings.forEach(item => {
      Object.assign(storage, item)
    })
  } else {
    storage = storageSettingMap
  }
})

chrome.storage.onChanged.addListener(function (changes, areaName) {
  debugLogger('info', 'chrome storage changed')
  storage = {}
  changes.chromeShanbaySettings.newValue.forEach(item => {
    Object.assign(storage, item)
  })
})

const pendingSearchSelection = (e) => {
  /**
   * 双击事件的监听器。
   * 处理选中区域，决定是否发出请求和弹出弹出框
   * 兼容性: node.getRootNode: chrome 54+
   * @param e 事件对象
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
        msg: '查询中....（请确保已登录扇贝网）'
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
   * 弹出层逻辑处理器
   * 先在页面中插入需要的弹出框，然后根据不同状态插入不同的内容
   * 里面还有弹出框上的各种交互事件的处理函数
   * @param data 需要弹出的数据和状态
   * */
  if (!selectionParentBody) {
    pendingSearchSelection()
  }

  // 先获取到弹窗应该出现的位置
  let html = `<div id="shanbay-popover" style="top: ${offset.top}px; left: ${offset.left}px; display: block" class="fade bottom in popover"><div class="arrow" style= ${offset.distance ? 'left:' + offset.distance + 'px' : ''}></div><div class="popover-inner"><div class="popover-title" style="border: none;"></div></div></div>`

  if (!document.querySelector('#shanbay-popover')) {
    selectionParentBody.insertAdjacentHTML('beforeEnd', html)
  }

  if (res.loading) {
    // 查询之前的提示
    document.querySelector('#shanbay-popover .popover-title').innerHTML = res.msg
  } else if (res.status_code === 0) {
    let data = res.data
    let contentHtml = `
<div class="popover-title">
    <span class="word">${data.content}</span>
    <a href="https://www.shanbay.com/bdc/vocabulary/${data.id}" style="float: right;" target="_blank"> 详细</a>
    <div>
        ${data.pronunciations.us ? `<span>us: </span><small>/${data.pronunciations.us}/</small>
        <span class="speaker" data-target="${data.us_audio}"></span>` : ''}
        
        ${data.pronunciations.uk ? `<span>uk: </span><small>/${data.pronunciations.uk}/</small>
        <span class="speaker" data-target="${data.uk_audio}"></span>` : ''}
        
    </div>
</div>
<div class="popover-content">
    <div class="simple-definition" style="margin-bottom: 20px; font-size: 16px;">
        ${storage.paraphrase !== 'English' ? (data.cn_definition.pos ? `<div><strong>${data.cn_definition.pos} </strong><span>${data.cn_definition.defn}</span></div>` : data.cn_definition.defn ? data.cn_definition.defn.split('\n').join('<br>') : '' ) : ''}
        ${ storage.paraphrase !== 'Chinese' ? Object.keys(data.en_definitions).map(pos => `<div><span>${pos}. </span><span>${data.en_definitions[pos].join(';')}</span></div>`).join('') : ''}
    </div>
    <div class="add" style="text-align: right;">
        ${data.learning_id ? `<p id="shanbay-forget-word"><button class="forget pull-right btn btn-success">我忘了</button></p>` : `<p><button id="shanbay-add-word" class="btn btn-success">添加</button></p>`}
        <p class="hide" id="shanbay-under-adding" style="text-align: right;"><span class="loading">正在添加</span></p>
    </div>
    <div id="shanbay-add-result" class="hide"></div>
</div>
  `

    document.querySelector('#shanbay-popover .popover-inner').innerHTML = contentHtml;

    // 各种点击事件的处理
    // 发音事件的处理
    [].forEach.call(document.querySelectorAll('#shanbay-popover .speaker'), (speaker) => {
      speaker.addEventListener('click', function () {
        chrome.runtime.sendMessage({action: 'playSound', url: this.dataset.target})
      })
    })

    // 添加单词和我忘了的事件处理
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
    // 查询正常，但是没有这个单词
    document.querySelector('#shanbay-popover .popover-inner').innerHTML = '<div class="popover-title" style="border: none;">没有找到这个单词</div>'
  } else {
    let m = 'unHandle response!!! Please tell <a href="https://github.com/maicss/chrome-shanbay-v2/issues">me</a> which word you lookup, thanks.'
    document.querySelector('#shanbay-popover .popover-title').innerHTML = m
    console.error(m, JSON.stringify(res))
  }
}

// background 交互返回信息的处理
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
   * @param range Range的实例
   * @return left, top 弹出框的位置; distance, 箭头的偏移量*/
  let {left, top, height, width} = range.getBoundingClientRect()
  // left += width / 2
  // 这里的22px是为了和单词保持一定距离
  // popup 宽度为280px, 然后算上选区的宽度，让箭头置中
  let windowWidth = left + width
  left = left - (280 - width) / 2
  top += (height + window.scrollY)
  // 处理单词靠边，popup 超出屏幕范围的情况
  // 140 是箭头原始的位置, 也就是popup宽度的一半
  let distance = 0
  if (left < 0) {
    distance = 140 + left
    left = 0
  } else if (left + 280 > window.innerWidth) {
    // 这里的10是为里防止右边边界出现的三角箭头出现在弹出框外面的情况，纯粹为了美观
    // 最终的效果就是单词在右边边界的时候，会跟浏览器的边框有一定的距离，因为排版的原因，右边可能空出一大截，而且不会对齐，但是浏览器左边肯定都是对齐的，所以弹出框在左边的时候，一定是靠在浏览器边界的。
    distance = 140 + (left + 280 - windowWidth) - 10
    left = windowWidth + 10 - 280
  }
  return {left, top, distance}
}

const hidePopover = (delay) => {
  /**
   * 隐藏弹出框的方法
   * @param delay, ms 隐藏弹出框的延迟
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
    // 屏蔽弹出框的双击事件
    const _popover = document.querySelector('#shanbay-popover')
    if (_popover && selectionParentBody) {
      if (!e.path.some(ele => ele === _popover)) {
        hidePopover()
      }
    }
  })
// })
}
// const nodeFilterParentBody = (node) => {
//   /**
//    * 获取一个元素的父级body的兼容性更好的方法
//    * @param node document node
//    *
//    * */
//   let parent = node.parentNode
//   if (parent.localName === 'body') {
//     return parent
//   } else {
//     return nodeFilterParentBody(parent)
//   }
// }