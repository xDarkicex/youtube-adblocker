// utils.ts
export const sendMessageToBackground = (message: any) => {
    return new Promise((resolve) => {
      // Check if bridge is ready or wait for it
      const waitForBridge = () => {
        let retryCount = 0;
        const maxRetries = 3;
        
        const attemptConnection = () => {
          const messageListener = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (!event.data || event.data.source !== 'youtube-adblocker-bridge') return;
            if (event.data.status === 'ready') {
              console.log("Bridge connection established");
              window.removeEventListener('message', messageListener);
              clearTimeout(timeoutId);
              sendMessageToBridge();
            }
          };
          
          window.addEventListener('message', messageListener);
          console.log(`Bridge connection attempt ${retryCount+1}/${maxRetries}...`);
          window.postMessage({source: 'youtube-adblocker-content', action: 'ping'}, '*');
          
          const timeoutId = setTimeout(() => {
            window.removeEventListener('message', messageListener);
            retryCount++;
            
            if (retryCount < maxRetries) {
              attemptConnection();
            } else {
              console.error(`Bridge failed to initialize after ${maxRetries} attempts`);
              resolve(null);
            }
          }, 2000);
        };
        
        attemptConnection();
      };
  
      // Actual message sending function
      const sendMessageToBridge = () => {
        // Create a unique message ID to match responses
        const messageId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        
        const responseListener = (event: MessageEvent) => {
          if (event.source !== window) return;
          if (!event.data || event.data.source !== 'youtube-adblocker-bridge') return;
          
          // Check if this is the response we're waiting for
          if (event.data.originalAction === message.action) {
            console.log("Received bridge response for action:", message.action);
            window.removeEventListener('message', responseListener);
            clearTimeout(timeoutId);
            resolve(event.data.response);
          }
        };
        
        window.addEventListener('message', responseListener);
        
        // Add message ID to help track the request
        window.postMessage({
          source: 'youtube-adblocker-content',
          action: message.action,
          stats: message.stats,
          messageId: messageId
        }, '*');
        
        // Set timeout for response with progressive retry
        const timeoutId = setTimeout(() => {
          window.removeEventListener('message', responseListener);
          console.error(`Bridge communication timed out for action: ${message.action}`);
          
          // Only resolve with null after timeout
          // This allows operations to continue even if messaging fails
          resolve(null);
        }, 5000);
      };
      
      // Start the process
      waitForBridge();
    });
  };
  
  
  
  
  // Initialize TrustedTypes only once as a utility function
  export const setupTrustedTypes = () => {
    try {
      if (typeof window !== 'undefined' && 
          (window as any).trustedTypes && 
          (window as any).trustedTypes.createPolicy && 
          !(window as any).trustedTypes.defaultPolicy) {
        
            (window as any).trustedTypes.createPolicy('default', {
          createHTML: (string: string) => string,
          createScript: (string: string) => string,
          createScriptURL: (string: string) => string
        });
        return true;
      }
    } catch (error) {
      console.error("Failed to set up TrustedTypes:", error);
    }
    return false;
  };
  
  export function appendElement(parent: Node, child: HTMLElement): void {
    parent.appendChild(child);
  }

  export async function generateUniqueRuleIds(count: number): Promise<number[]> {
    // Get all existing rule IDs
    const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
    const existingIds = new Set(existingRules.map(rule => rule.id));
    
    // Create an array to hold our unique IDs
    const uniqueIds: number[] = [];
    
    // Start at a random high number to avoid conflicts
    let baseId = Math.floor(Math.random() * 100000) + 100000;
    
    // Generate unique IDs
    for (let i = 0; i < count; i++) {
      // Find the next ID that's not in use
      while (existingIds.has(baseId)) {
        baseId++;
      }
      
      uniqueIds.push(baseId);
      existingIds.add(baseId); // Mark as used
      baseId++; // Move to next potential ID
    }
    
    return uniqueIds;
  }
  