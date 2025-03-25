class PerformanceTracker {
    private static instance: PerformanceTracker;
    private count = 0;
  
    private constructor() {
      chrome.storage.local.get(['adCount'], (data) => {
        this.count = data.adCount || 0;
      });
    }
  
    public logBlock() {
      this.count++;
      if (this.count % 5 === 0) {
        chrome.storage.local.set({ adCount: this.count });
      }
    }
  
    public static getInstance() {
      if (!this.instance) this.instance = new PerformanceTracker();
      return this.instance;
    }
  }