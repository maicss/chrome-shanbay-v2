import { debugLogger } from "./const";

chrome.runtime.onMessage.addListener(handleMessages);

// This function performs basic filtering and error checking on messages before
// dispatching the message to a more specific message handler.
async function handleMessages(message) {
  // Return early if this message isn't meant for the offscreen document.
  debugLogger('log', "offscreen received message:", message)

  if (message.target !== 'offscreen') {
    return false;
  }

  // Dispatch the message to an appropriate handler.
  switch (message.action) {
    case 'playSound':
      const audio = new Audio(message.url);
      audio.volume = 1;
      audio.play();
      return true;

    default:
      debugLogger('warn', `Unexpected message action received: '${message.action}'.`);
      return false;
  }
}