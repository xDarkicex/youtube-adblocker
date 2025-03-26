import { sendMessageToBackground } from './utils';
// Export as named export instead of default
export class PerformanceTracker {
    private static instance: PerformanceTracker;
    private count = 0;
    private lastSaveTimestamp = 0;
    private readonly SAVE_INTERVAL = 30000; // 30 seconds between saves
  
    private constructor() {
        this.initializeCount();
    }
  
    private async initializeCount() {
        try {
            // Use message passing to get stats instead of direct storage access
            const stats = await this.getStatsFromBackground();
            this.count = stats.totalAdBlocked;
        } catch (error) {
            console.error('Failed to initialize performance tracker:', error);
            this.count = 0;
        }
    }
    
    // Helper method to get stats from background script via message passing
    private getStatsFromBackground(): Promise<{totalAdBlocked: number, lastBlockTimestamp: number}> {
        return new Promise(async (resolve) => {
          const response = await sendMessageToBackground({action: "getAdBlockStats"});
          // Add type guard and default values
          const stats = response && typeof response === 'object' && 'totalAdBlocked' in response
            ? response as {totalAdBlocked: number, lastBlockTimestamp: number}
            : {totalAdBlocked: 0, lastBlockTimestamp: Date.now()};
          resolve(stats);
        });
      }
      
  
      public async logBlock() {
        this.count++;
        const currentTime = Date.now();
        
        if (currentTime - this.lastSaveTimestamp > this.SAVE_INTERVAL) {
          try {
            // Use the bridge communication pattern
            await sendMessageToBackground({
              action: "updateAdBlockStats",
              stats: {
                totalAdBlocked: this.count,
                lastBlockTimestamp: currentTime
              }
            });
            this.lastSaveTimestamp = currentTime;
          } catch (error) {
            console.error('Failed to save ad block stats:', error);
          }
        }
      }
      
  
    public static getInstance(): PerformanceTracker {
        if (!this.instance) {
            this.instance = new PerformanceTracker();
        }
        return this.instance;
    }

    public async getBlockCount(): Promise<number> {
        return this.count;
    }
}
