import { generateUniqueRuleIds } from './utils';
// Export interface explicitly
export interface AdBlockStats {
    totalAdBlocked: number;
    lastBlockTimestamp: number;
}

const whitelistedDomains = [
    "s.youtube.com",        // Essential for video playback
    "i.ytimg.com",          // YouTube images/thumbnails
    "www.youtube.com",      // Main YouTube domain
    "youtube.com",          // Main YouTube domain
    "yt3.ggpht.com",        // Channel profile images
    "lh3.googleusercontent.com", // User profile images
    "fonts.gstatic.com"     // Fonts
  ];

class AdBlockManager {
    private static instance: AdBlockManager | null = null;
    
    private blockedDomains: string[] = [
        // Standard ad domains (remove duplicates)
        "*://*.doubleclick.net/*",
        "*://*.googlesyndication.com/*",
        "*://googleads.g.doubleclick.net/*",
        
        // YouTube-specific ad endpoints
        "*://*.youtube.com/api/stats/ads*",
        "*://*.youtube.com/pagead/*",
        "*://*.youtube.com/ptracking*",
        "*://*.youtube.com/get_video_info*adformat*",
        
        // Video ad URLs (more specific patterns)
        "*://*.googlevideo.com/videoplayback*ctier=L*",
        "*://*.googlevideo.com/videoplayback*&oad*",
        "*://*.googlevideo.com/videoplayback*&adformat*",
        
        // YouTube ad API endpoints (2025 updates)
        "*://*.youtube.com/youtubei/v1/player?key=*&adSignalsInfo*",
        "*://*.youtube.com/youtubei/v1/next?key=*&adSignalsInfo*",
        
        // New ad network patterns
        "*://*.youtube-nocookie.com/gen_204*",
        "*://www.youtube.com/pagead/interaction/*",
        "*://www.youtube.com/api/stats/watchtime?adformat*",
        "*://www.youtube.com/api/stats/qoe?adformat*",
        "*://www.youtube.com/api/stats/atr*",
        "*://www.googleadservices.com/*",
        
        // Secondary ad serving domains
        "*://static.doubleclick.net/*",
        "*://googleads.g.doubleclick.net/*"
    ];
        
    private constructor() {
        // Set up message handling for communication with content script
        this.setupMessageHandling();
    }

    private setupMessageHandling() {
        // Handle one-time messages
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
          if (message.action === "getAdBlockStats") {
            this.getAdBlockStats().then(stats => {
              try {
                sendResponse(stats);
              } catch (e) {
                console.error("Error sending response:", e);
              }
            }).catch(error => {
              console.error("Stats retrieval error:", error);
              try {
                sendResponse({ error: String(error), totalAdBlocked: 0 });
              } catch (e) {
                console.error("Error sending error response:", e);
              }
            });
            return true; // Indicates async response
          }
          
          if (message.action === "updateAdBlockStats") {
            this.updateAdBlockStats(message.stats).then(() => {
              try {
                sendResponse({ success: true });
              } catch (e) {
                console.error("Error sending response:", e);
              }
            }).catch(error => {
              console.error('Stats update error:', error);
              try {
                sendResponse({ success: false, error: String(error) });
              } catch (e) {
                console.error("Error sending error response:", e);
              }
            });
            return true; // Indicate async response
          }
        });
        
        // Handle long-lived connections
        chrome.runtime.onConnect.addListener((port) => {
          console.log("Connection established with", port.name);
          
          port.onMessage.addListener((message) => {
            console.log("Received port message:", message);
            
            if (message.action === "getAdBlockStats") {
              this.getAdBlockStats().then(stats => {
                port.postMessage({ 
                  ...stats, 
                  success: true, 
                  originalAction: message.action 
                });
              }).catch(error => {
                console.error("Stats retrieval error:", error);
                port.postMessage({ 
                  error: String(error), 
                  success: false, 
                  originalAction: message.action,
                  totalAdBlocked: 0 
                });
              });
            }
            
            if (message.action === "updateAdBlockStats") {
              this.updateAdBlockStats(message.stats).then(() => {
                port.postMessage({ 
                  success: true, 
                  originalAction: message.action 
                });
              }).catch(error => {
                console.error('Stats update error:', error);
                port.postMessage({ 
                  success: false, 
                  error: String(error), 
                  originalAction: message.action 
                });
              });
            }
          });
        });
      }
      
      
    private async getAdBlockStats(): Promise<AdBlockStats> {
        try {
            const data = await chrome.storage.local.get(['adBlockStats']);
            return data.adBlockStats || { 
                totalAdBlocked: 0, 
                lastBlockTimestamp: Date.now() 
            };
        } catch (error) {
            console.error('Failed to get ad block stats:', error);
            return { 
                totalAdBlocked: 0, 
                lastBlockTimestamp: Date.now() 
            };
        }
    }

    private async updateAdBlockStats(stats: AdBlockStats): Promise<void> {
        try {
            await chrome.storage.local.set({ adBlockStats: stats });
        } catch (error) {
            console.error('Failed to update ad block stats:', error);
        }
    }

    public async initialize(): Promise<void> {
        await this.setupNetworkRules();
        await this.setupPerformanceLogging();
    }

    private async setupNetworkRules(): Promise<void> {
        try {
            // Chrome's declarative net request has a default max of 100 rules
            const MAX_RULES = 100;
            const currentRules = await chrome.declarativeNetRequest.getDynamicRules();

            // Slice domains to fit within rule limit
            const rulesToAdd = this.blockedDomains.slice(0, MAX_RULES).map((url, index) => ({
                id: index + 1,
                priority: 2,
                action: { type: chrome.declarativeNetRequest.RuleActionType.BLOCK },
                condition: {
                    urlFilter: url,
                    resourceTypes: [
                        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
                        chrome.declarativeNetRequest.ResourceType.SCRIPT,
                        chrome.declarativeNetRequest.ResourceType.IMAGE,
                        chrome.declarativeNetRequest.ResourceType.STYLESHEET,
                        chrome.declarativeNetRequest.ResourceType.MEDIA
                    ]
                }
            }));

            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: currentRules.map(rule => rule.id),
                addRules: rulesToAdd
            });

            console.log(`Loaded ${rulesToAdd.length} network blocking rules`);
        } catch (error) {
            console.error('Network Rule Setup Failed:', error);
        }
    }

    private async setupPerformanceLogging(): Promise<void> {
        try {
            const data = await chrome.storage.local.get(['adBlockStats']);
            const stats: AdBlockStats = data.adBlockStats || { 
                totalAdBlocked: 0, 
                lastBlockTimestamp: Date.now() 
            };

            await chrome.storage.local.set({ adBlockStats: stats });
        } catch (error) {
            console.error('Performance Logging Setup Failed:', error);
        }
    }

    public static async getInstance(): Promise<AdBlockManager> {
        if (!AdBlockManager.instance) {
            AdBlockManager.instance = new AdBlockManager();
            await AdBlockManager.instance.initialize();
        }
        return AdBlockManager.instance;
    }
}

// Initialization with robust error handling
(async () => {
    try {
        await AdBlockManager.getInstance();
        console.log('✅ Ad Blocking Initialized Successfully');
    } catch (error) {
        console.error('❌ Ad Block Initialization Error:', error);
    }
})();

// Set up periodic updates
chrome.runtime.onInstalled.addListener(() => {
    // Update rules when extension is installed or updated
    updateAdBlockRules();
    
    // Create an alarm to update every 24 hours
    chrome.alarms.create('updateAdRules', { periodInMinutes: 24 * 60 });
  });
  
  // Listen for the alarm
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'updateAdRules') {
      updateAdBlockRules();
    }
  });
  
  // Attempt to update rules when extension starts
  (async () => {
    try {
      await updateAdBlockRules();
    } catch (error) {
      console.error('[YouTube AdBlocker] Failed to update rules on startup:', error);
    }
  })();
  

// In background.ts or a separate fetch script
async function fetchYouTubeAdDomains(): Promise<string[]> {
    try {
      console.log('[YouTube AdBlocker] Fetching ad domains from GitHub...');
      const response = await fetch(
        'https://raw.githubusercontent.com/kboghdady/youTube_ads_4_pi-hole/master/youtubelist.txt'
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch domain list: ${response.status}`);
      }
      
      const text = await response.text();
      
      // Process the domains (one per line)
      const domains = text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
      
      // Filter out whitelisted domains
      const filteredDomains = domains.filter(domain => 
        !whitelistedDomains.some(whiteDomain => 
          domain === whiteDomain || domain.includes(whiteDomain)
        )
      );
      
      console.log(`[YouTube AdBlocker] Fetched ${domains.length} domains, filtered out ${domains.length - filteredDomains.length} whitelisted domains`);
      
      return filteredDomains;
    } catch (error) {
      console.error('[YouTube AdBlocker] Error fetching YouTube ad domains:', error);
      return [];
    }
  }
  


  async function updateAdBlockRules() {
    try {
      console.log('[YouTube AdBlocker] Starting ad blocking rules update...');
      
      // Rest of your existing code for removing rules...
      
      // 3. Fetch and process domains
      const storedData = await chrome.storage.local.get('adDomains');
      let cachedDomains = storedData.adDomains || [];
      
      const freshDomains = await fetchYouTubeAdDomains(); // This now includes whitelist filtering
      const adDomains = freshDomains.length > 0 ? freshDomains : cachedDomains;
      
      if (freshDomains.length > 0) {
        await chrome.storage.local.set({
          adDomains: freshDomains,
          lastUpdated: Date.now()
        });
      }
      
      // Log information about whitelisted domains
      console.log(`[YouTube AdBlocker] Whitelist enabled for ${whitelistedDomains.length} domains, including ${whitelistedDomains.join(', ')}`);
      
      // Rest of your existing code for creating rules...
    } catch (error) {
      // Error handling...
    }
  }
  
  
  
  
  

// Helper function to get current rule IDs
async function getCurrentRuleIds() {
    const rules = await chrome.declarativeNetRequest.getDynamicRules();
    return rules.map(rule => rule.id);
}


export default AdBlockManager;
