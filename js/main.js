let selectionParentBody = null
let offset = null
let storage = {}

chrome.storage.sync.get('chromeShanbaySettings', (settings) => {
  console.log('chrome storage loaded......')
  if (Object.keys(settings).length) {
    settings.chromeShanbaySettings.forEach(item => {
      Object.assign(storage, item)
    })
  } else {
    storage = storageSettingMap
  }
})

chrome.storage.onChanged.addListener(function (changes, areaName) {
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
    document.querySelector('#shanbay-popover .popover-title').innerHTML = html
  } else if (res.status_code === 0) {
    let data = res.data
    html = `
<div class="popover-title">
    <span class="word">${data.content}</span>
    <a href="https://www.shanbay.com/bdc/vocabulary/${data.id}" style="float: right;" target="_blank"> 详细</a>
    <div>
        ${data.pronunciations.us ? `<span>us: </span><small>/${data.pronunciations.us}/</small>
        <audio src="${data.us_audio}" id="shanbay-us-audio"></audio>
        <span class="speaker" data-target="shanbay-us-audio"></span>` : ''}
        
        ${data.pronunciations.uk ? `<span>uk: </span><small>/${data.pronunciations.uk}/</small>
        <audio src="${data.uk_audio}" id="shanbay-uk-audio"></audio>
        <span class="speaker" data-target="shanbay-uk-audio"></span>` : ''}
        
    </div>
</div>
<div class="popover-content">
    <div class="simple-definition" style="margin-bottom: 20px; font-size: 16px;">
        ${data.cn_definition.pos ? `<div><strong>${data.cn_definition.pos} </strong><span>${data.cn_definition.defn}</span></div>` : data.cn_definition.defn ? data.cn_definition.defn.split('\n').join('<br>') : ''}
        ${Object.keys(data.en_definitions).map(pos => `<div><span>${pos}. </span><span>${data.en_definitions[pos].join(';')}</span></div>`).join('')}
    </div>
    <div class="add" style="text-align: right;">
        ${data.learning_id ? `<p id="shanbay-forget-word"><button class="forget pull-right btn btn-success">我忘了</button></p>` : `<p><button id="shanbay-add-word" class="btn btn-success">添加</button></p>`}
        <p class="hide" id="shanbay-under-adding" style="text-align: right;"><span class="loading">正在添加</span></p>
    </div>
    <div id="shanbay-add-result" class="hide"></div>
</div>
  `

    document.querySelector('#shanbay-popover .popover-inner').innerHTML = html;
    // 各种点击事件的处理

    [].forEach.call(document.querySelectorAll('#shanbay-popover .speaker'), (speaker) => {
      speaker.addEventListener('click', function () {
        document.querySelector(`#${this.dataset.target}`).play()
      })
      console.log(speaker.dataset)
    })

    if (data.learning_id) {
      document.querySelector('#shanbay-forget-word').addEventListener('click', function () {
        chrome.runtime.sendMessage({action: 'forgetWord', learningId: data.learning_id})
      })
    } else {
      document.querySelector('#shanbay-add-word').addEventListener('click', function () {
        document.querySelector('#shanbay-add-word').className = 'hide'
        document.querySelector('#shanbay-under-adding').className = ''
        chrome.runtime.sendMessage({action: 'addWord', id: data.id})
      })
    }

  } else if (res.status_code === 1) {
    // 查询正常，但是没有这个单词
    console.log(res)
    document.querySelector('#shanbay-popover .popover-inner').innerHTML = '<div class="popover-title" style="border: none;">没有找到这个单词</div>'
  } else {
    console.error('popup unexcept res', res)
  }
}

chrome.runtime.onMessage.addListener(function (res, sender) {
  console.log('get res: ', JSON.stringify(res.data))
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
        addResult.innerHTML = `成功加入生词库！<a href="https://www.shanbay.com/review/learning/${res.data.data.id}">查看</a>`
      } else {
        addResult.innerHTML = '单词添加失败，请重试'
      }
      break
    case 'forgetWord':
      document.querySelector('#shanbay-forget-word').className = 'hide'
      addResult = document.querySelector('#shanbay-add-result')
      addResult.className = ''
      if (res.data.msg === 'SUCCESS') {
        addResult.innerHTML = `成功加入生词库！<a href="https://www.shanbay.com/review/learning/${res.data.data.id}">查看</a>`
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
   * @return left, top 弹出框的位置 distance， 箭头的偏移量*/
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
    distance = 140 + (left + 280 - windowWidth)
    left = windowWidth - 280
  }
  return {left, top, distance}
}

const hidePopover = (delay) => {
  setTimeout(function () {
    selectionParentBody.removeChild(document.querySelector('#shanbay-popover'))
    selectionParentBody = null
  }, delay || 0)
}

if (document.addEventListener || event.type === "load" || document.readyState === "complete") {
// document.addEventListener('DOMContentLoaded', function () {
  console.log('Extension detected DOMContentLoaded......')
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