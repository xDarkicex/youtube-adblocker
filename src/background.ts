class AdBlockManager {
    private static instance: AdBlockManager;
    private blockedDomains = new Set<string>([
      'doubleclick.net',
      'googlevideo.com/videoplayback',
      'youtube.com/api/stats/ads'
    ]);
  
    private constructor() {
      chrome.webRequest.onBeforeRequest.addListener(
        this.blockRequest.bind(this),
        { urls: ['<all_urls>'] },
        ['blocking']
      );
    }
  
    private blockRequest(details: chrome.webRequest.WebRequestBodyDetails) {
      const url = new URL(details.url);
      return { 
        cancel: Array.from(this.blockedDomains).some(domain => 
          url.hostname.includes(domain)
      };
    }
  
    public static getInstance() {
      if (!this.instance) this.instance = new AdBlockManager();
      return this.instance;
    }
  }
  
  // Initialize
  AdBlockManager.getInstance();