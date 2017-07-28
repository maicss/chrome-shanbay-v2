const renderOptions = (settings) => {
  /**
   * 根据配置渲染页面的方法
   * @param settings: 页面配置的数组
  * */
  settings.forEach(setting => {
    let name = Object.keys(setting)[0]
    let value = setting[name]
    let inputs = document.querySelectorAll(`input[name="${name}"]`)
    if (inputs.length) {
      if (inputs[0].type === 'checkbox') {
        inputs[0].checked = value
      } else if (inputs[0].type === 'radio') {
        [].forEach.call(inputs, input => {
          if (input.value === value.toString()) {
            input.checked = true
          }
        })
      } else {
        inputs[0].value = value
      }
    } else {
      document.querySelector(`select[name="${name}"]`).value = value
    }

  })
}

const getOptions = () => {
  /**
   * 根据页面的选项获取设置信息
   * @return setting 配置信息的数组
   * */
  const inputs = document.querySelectorAll('input')
  const settings = [];
  [].forEach.call(inputs, input => {
    if (input.type === 'checkbox') {
      settings.push({
        [input.name]: input.checked
      })
    } else if (input.type === 'radio') {
      if (input.checked) {
        settings.push({
          [input.name]: input.value === 'true'
        })
      }

    } else {
      settings.push({
        [input.name]: input.value
      })
    }
  })
  const selects = document.querySelectorAll('select');
  [].forEach.call(selects, select => {
    settings.push({
      [select.name]: select.value
    })
  })
  return settings
}

document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.sync.get('chromeShanbaySettings', (settings) => {
    debugLogger('log', 'chromeShanbaySettings: ', settings)
    if (Object.keys(settings).length) {
      renderOptions(settings.chromeShanbaySettings)
    } else {
      renderOptions(storageSettingArray)
    }
  })


  document.querySelector('#save').onclick = function () {
    let _settings = getOptions()
    chrome.storage.sync.set({chromeShanbaySettings: _settings}, () => {
      console.log('lastError in options js: ', chrome.runtime.lastError)
      if (!chrome.runtime.lastError) {
        const saveRes = document.querySelector('#saveRes');
        saveRes.className = ''
        setTimeout(function () {
          saveRes.className = 'hide'
        }, 1000)
      }
      debugLogger('log', 'chromeShanbaySettings settled.')
    })
  }
})