chrome.runtime.onMessage.addListener(function (message) {
  
  if (message.target === 'offscreen') {
    switch (message.action) {
      case 'playSound':
        const audio = new Audio(message.url);
        audio.volume = 1;
        audio.play();
        break
    
      default:
        console.log('warn', `Unexpected message action received: '${message.action}'.`);
    }
  }
});