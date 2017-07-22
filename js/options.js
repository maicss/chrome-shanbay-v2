// todo save localStorage to background
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
  renderOptions(localStorageSettings)
  document.querySelector('#save').click = function () {
    let settings = getOptions()
    settings.forEach(setting => {
      let key = Object.keys(setting)[0]
      localStorage[key] = setting[key]
    })
  }
})