console.log("Bridge loaded at:", Date.now());

// Track active connections
let activePort: chrome.runtime.Port | null = null;

// Let content script know bridge is ready IMMEDIATELY
window.postMessage({
  source: 'youtube-adblocker-bridge',
  status: 'ready'
}, '*');

// Broadcast ready status periodically to ensure detection
let readyInterval = setInterval(() => {
  window.postMessage({
    source: 'youtube-adblocker-bridge',
    status: 'ready'
  }, '*');
}, 200);

setTimeout(() => {
  clearInterval(readyInterval);
}, 2000);

// Listen for content script messages
window.addEventListener('message', (event) => {
  // Only accept messages from our window
  if (event.source !== window) return;
  // Verify it's from our content script
  if (!event.data || event.data.source !== 'youtube-adblocker-content') return;
  
  console.log("Bridge received message:", event.data.action);
  
  // Handle ping separately for connection establishment
  if (event.data.action === 'ping') {
    window.postMessage({
      source: 'youtube-adblocker-bridge',
      status: 'ready'
    }, '*');
    return;
  }
  
  // For actual data messages, use long-lived port if available
  if (!activePort) {
    // Create a long-lived connection to background
    activePort = chrome.runtime.connect({name: 'youtube-adblocker'});
    
    // Handle port disconnect
    activePort.onDisconnect.addListener(() => {
      console.log("Background connection disconnected");
      activePort = null;
    });
    
    // Set up message handler
    activePort.onMessage.addListener((response) => {
      console.log("Received background response:", response);
      // Forward response to content script
      window.postMessage({
        source: 'youtube-adblocker-bridge',
        response: response,
        originalAction: response.originalAction
      }, '*');
    });
  }
  
  // Send message through port
  if (activePort) {
    try {
      activePort.postMessage({
        action: event.data.action,
        stats: event.data.stats,
        originalAction: event.data.action
      });
    } catch (e) {
      console.error("Port error:", e);
      // Reset port and send error response
      activePort = null;
      window.postMessage({
        source: 'youtube-adblocker-bridge',
        response: { success: false, error: "Communication error" },
        originalAction: event.data.action
      }, '*');
    }
  }
});
