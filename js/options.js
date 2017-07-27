// todo save localStorage to background
// todo 测试用户未登录的状况
const renderOptions = (settings) => {
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
  const inputs = document.querySelectorAll('input')
  const defaultSettings = [];
  [].forEach.call(inputs, input => {
    if (input.type === 'checkbox') {
      defaultSettings.push({
        [input.name]: input.checked
      })
    } else if (input.type === 'radio') {
      if (input.checked) {
        defaultSettings.push({
          [input.name]: input.value === 'true'
        })
      }

    } else {
      defaultSettings.push({
        [input.name]: input.value
      })
    }
  })
  const selects = document.querySelectorAll('select');
  [].forEach.call(selects, select => {
    defaultSettings.push({
      [select.name]: select.value
    })
  })
  return defaultSettings
}

document.addEventListener('DOMContentLoaded', function () {
  chrome.storage.sync.get('chromeShanbaySettings', (settings) => {
    console.log('chromeShanbaySettings: ', settings)
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
        // _settings.forEach(item => {
        //   Object.assign(storage, item)
        // })
        const saveRes = document.querySelector('#saveRes');
        saveRes.className = ''
        setTimeout(function () {
          saveRes.className = 'hide'
        }, 1000)
      }
      console.log('chromeShanbaySettings settled.')
    })
  }
})