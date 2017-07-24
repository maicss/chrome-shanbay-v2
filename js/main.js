let selectionParentBody = null
let offset = null
let storage = null

const pendingSearchSelection = (e) => {
  /**
   * 双击事件的监听器。
   * 处理选中区域，决定是否发出请求和弹出弹出框
   * 兼容性: node.getRootNode: chrome 54+
   * @param e 事件对象
   * */
  selectionParentBody = e.target.getRootNode().body
  offset = getSelectionPosition(getSelection().getRangeAt(0))
  // console.group('test')
  // console.log('range: ', offset)
  // console.log('client: ', e.clientX, e.clientY)
  // console.log('layer: ', e.layerX, e.layerY)
  // console.log('movement: ', e.movementX, e.movementY)
  // console.log('page: ', e.pageX, e.pageY)
  // console.log('screen: ', e.screenX, e.screenY)
  // console.groupEnd('test')
  // offset = {left: e.screenX, top: e.screenY}
  let matchResult = getSelection().toString().trim().match(/^[a-zA-Z\s']+$/)
  if (matchResult) {
    popover({
      loading: true,
      msg: '查询中....（请确保已登录扇贝网）'
    })
    request(shanbayAPI.lookUp.url + matchResult[0]).then(res => popover(res))
    // chrome.runtime.sendMessage({
    //   action: 'wordLookup',
    //   data: matchResult[0]
    // }, res => popover(res))
  }
}

const popover = (res) => {
  /**
   * 弹出层逻辑处理器
   * @param data 需要弹出的数据和状态
   * */

  let _data = {
    'msg': 'SUCCESS',
    'status_code': 0,
    'data': {
      'pronunciations': {'uk': '\'d\u0292eli', 'us': '\'d\u0292eli'},
      'en_definitions': {
        'v': ['make into jelly'],
        'n': ['an edible jelly (sweet or pungent) made with gelatin and used as a dessert or salad base or a coating for foods', 'a preserve made of the jelled juice of fruit', 'any substance having the consistency of jelly or gelatin']
      },
      'audio_addresses': {
        'uk': ['https://media-audio1.baydn.com/uk%2Fj%2Fje%2Fjelly_v3.mp3', 'http://media-audio1.qiniu.baydn.com/uk/j/je/jelly_v3.mp3'],
        'us': ['https://media-audio1.baydn.com/us%2Fj%2Fje%2Fjelly_v3.mp3', 'http://media-audio1.qiniu.baydn.com/us/j/je/jelly_v3.mp3']
      },
      'uk_audio': 'http://media.shanbay.com/audio/uk/jelly.mp3',
      'conent_id': 7621,
      'audio_name': 'jelly_v3',
      'cn_definition': {
        'pos': '',
        'defn': 'n. \u679c\u51bb,\u51bb\u72b6\u7269,\u7ea0\u7ed3\nvi. \u7ed3\u51bb,\u505a\u679c\u51bb\nvt. \u4f7f\u50cf\u679c\u51bb\u4e00\u6837'
      },
      'num_sense': 1,
      'content_type': 'vocabulary',
      'sense_id': 0,
      'id': 7621,
      'definition': ' n. \u679c\u51bb,\u51bb\u72b6\u7269,\u7ea0\u7ed3\nvi. \u7ed3\u51bb,\u505a\u679c\u51bb\nvt. \u4f7f\u50cf\u679c\u51bb\u4e00\u6837',
      'content_id': 7621,
      'url': 'https://www.shanbay.com/bdc/mobile/preview/word?word=jelly',
      'has_audio': true,
      'en_definition': {'pos': 'v', 'defn': 'make into jelly'},
      'object_id': 7621,
      'content': 'jelly',
      'pron': '\'d\u0292eli',
      'pronunciation': '\'d\u0292eli',
      'audio': 'http://media.shanbay.com/audio/us/jelly.mp3',
      'us_audio': 'http://media.shanbay.com/audio/us/jelly.mp3'
    }
  }

  // 先获取到弹窗应该出现的位置
  let html = ''
  if (res.loading) {
    // 查询之前的提示
    html = `<div class="popover-title">${res.msg}</div>`
  } else if (res.status_code === 0) {
    // let data = res.data;
    let data = _data.data
    html = `
  <div class="arrow"></div>
  <div class="popover-inner">
        <div class="popover-title">
            <span class="word">${data.content}</span>
            <a href="https://www.shanbay.com/review/learning/${data.learning_id}" style="float: right; margin-top: 12px;" target="_blank"> 详细</a>
            <div>
                <span>us:</span><small>${data.pronunciations.us}</small>
                <span class="speaker" data-target="us"><i class="icon-volume-off"></i></span>
                 
                <span>uk:</span><small>${data.pronunciations.uk}</small>
                <span class="speaker" data-target="uk"><i class="icon-volume-off"></i></span></div>
            </div>
        <div class="popover-content">
            <div class="simple-definition" style="margin-bottom: 20px; font-size: 16px;">
                ${data.cn_definition.defn.split('\n').map(def => `<div><span>${def.split('. ')[0]}. </span><span>${def.split('. ')[1]}</span></div>`).join('')}
                ${Object.keys(data.en_definitions).map(pos => `<div><span>${pos}. </span><span>${data.en_definitions[pos].join(';')}</span></div>`).join('')}
            </div>
            <div class="add">
                ${data.learning_id ? `<p><button class="forget pull-right btn btn-success">我忘了</button></p>` : `<p style="text-align: right;"><button id="add-word" class="btn btn-success">添加</button></p>`}
                <p style="text-align: right;"><span class="loading hide">&nbsp; &nbsp; 正在添加</span></p>
            </div>
            <div class="word-added hide"><p style="font-size: 14px; text-align: right"> 成功添加进你的词库</div>
        </div>
    </div>
  `
  } else if (res.status_code === 1) {
    // 查询正常，但是没有这个单词
    console.log(res)
  } else {
    console.error(res)
  }
  html = `<div id="shanbay-popover" style="top: ${offset.top}; left: ${offset.left}; display: block" class="fade bottom in popover"> ${html}</div>`
  selectionParentBody.insertAdjacentHTML('beforeEnd', html)
}

const getSelectionPosition = (range) => {
  /**
   * 得到弹出框的绝对位置
   * @param range Range的实例
   * @return left, top 弹出框的位置*/
  let {left, top, height, width} = range.getBoundingClientRect()
  // left += width / 2
  // 这里的22px是为了和单词保持一定距离
  top += height
  return {left, top}
}

const setPopoverPosition = (offset) => {

}

const hidePopover = (delay) => {
  setTimeout(function () {
    selectionParentBody.removeChild(document.querySelector('#shanbay-popover'))
    selectionParentBody = null
  }, delay || 0)
}

if (document.readyState === 'complete') {
  document.addEventListener('dblclick', pendingSearchSelection)
  document.addEventListener('click', function (e) {
    const _popover = document.querySelector('#shanbay-popover')
    if (_popover && selectionParentBody) {
      if (!e.path.some(ele => ele === _popover)) {
        hidePopover()
      }
    }
  })
}

const nodeFilterParentBody = (node) => {
  /**
   * 获取一个元素的父级body的兼容性更好的方法
   * @param node document node
   *
   * */
  let parent = node.parentNode
  if (parent.localName === 'body') {
    return parent
  } else {
    return nodeFilterParentBody(parent)
  }
}