import { PerformanceTracker } from './performance';
import { sendMessageToBackground, setupTrustedTypes, appendElement } from './utils';

setupTrustedTypes();

class YouTubeAdRemover {
  private invalidSelectors: string[] = [];
  private observer!: MutationObserver; // Use non-null assertion operator
  private performanceTracker: PerformanceTracker;
  private debugMode = false;
  private removedElements: {element: Element, selector: string, timestamp: number}[] = [];
  private selectorStats: Record<string, {attempts: number, matches: number}> = {};
  constructor() {
    this.performanceTracker = PerformanceTracker.getInstance();
    this.debugMode = false;
    this.removedElements = [];
    
    // Validate selectors on initialization
    this.validateSelectors();
    if (this.invalidSelectors.length > 0) {
      console.warn(`[YouTube AdBlocker] Found ${this.invalidSelectors.length} invalid selectors that will be skipped.`);
    }
    
    this.bypassAntiAdblockDetection();
    this.setupAdRemoval();
  }
  
  
  private safeQuerySelectorAll(selector: string): NodeList {
    try {
      return document.querySelectorAll(selector);
    } catch (error) {
      this.invalidSelectors.push(selector);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[YouTube AdBlocker] Invalid selector will be skipped: "${selector}" - ${errorMessage}`);
      // Return an empty NodeList
      return document.querySelectorAll('.__non_existent_element__');
    }
  }
  
  
  private setupAdRemoval() {
    // More comprehensive MutationObserver configuration
    this.observer = new MutationObserver(this.throttle(this.removeAds.bind(this)));
    this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributeFilter: ['class', 'style', 'src', 'data-ad', 'aria-label'],
        characterData: false
    });
    
    // Multiple event listeners for better coverage
    window.addEventListener('yt-navigate-finish', this.removeAds.bind(this));
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            this.removeAds();
        }
    });
    
    // Initial check on load
    if (document.readyState === 'complete') {
        this.removeAds();
    } else {
        window.addEventListener('load', this.removeAds.bind(this));
    }
}


  private throttle(fn: Function) {
    let timeout: number | null = null;
    return () => {
      if (timeout !== null) {
        window.clearTimeout(timeout);
      }
      timeout = window.setTimeout(() => {
        fn();
        timeout = null;
      }, 300);
    };
  }

  private async removeAds() {
    try {
      this.skipVideoAds();
      const adsToRemove = [];
      
      // Safely process each selector independently
      for (const selector of YouTubeAdRemover.SELECTORS) {
        try {
          const elements = Array.from(this.safeQuerySelectorAll(selector));
          this.trackSelectorUsage(selector, elements.length);
          
          // Filter only elements that should be removed
          const filteredElements = elements.filter(el => {
            if (!el) return false;
            
            try {
              // Type assertion for each Element method call
              const element = el as Element;
              
              // Check if element is within protected areas
              if (element.closest('#movie_player') || element.closest('.ytp-popup')) {
                return false;
              }
              
              // Check against the protected elements list
              return !YouTubeAdRemover.PROTECTED_ELEMENTS.some(protectedSelector => {
                try {
                  return element.matches(protectedSelector) || !!element.closest(protectedSelector);
                } catch (e) {
                  return false;
                }
              });
            } catch (error) {
              console.error('[YouTube AdBlocker] Error filtering element:', error);
              return false;
            }
          });
           
          adsToRemove.push(...filteredElements);
        } catch (error) {
            const errorName = error instanceof Error ? error.name : 'UnknownError';
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[YouTube AdBlocker] Ad removal error: ${errorName}: ${errorMessage}`, error);
        }
      }
      
      // Log and remove the elements
      if (this.debugMode && adsToRemove.length > 0) {
        console.log(`[YouTube AdBlocker] Removing ${adsToRemove.length} ad elements`);
      }
      
      // Fixed element removal with type assertion
      for (const el of adsToRemove) {
        try {
          this.storeRemovedElement(el as Element);
          (el as HTMLElement).remove();
          await this.performanceTracker.logBlock();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[YouTube AdBlocker] Error: ${errorMessage}`, error);
        }
      }
    } catch (error) {
        const errorName = error instanceof Error ? error.name : 'UnknownError';
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[YouTube AdBlocker] Ad removal error: ${errorName}: ${errorMessage}`, error);
    }
  }
  
  private static readonly PROTECTED_ELEMENTS = [
    // Main header and navigation
    '#masthead-container',
    'ytd-masthead',
    '#container.ytd-masthead',
    '#header',
    '#logo',
    '#search-container',
    '.ytd-searchbox',
    '#search-form',
    
    // Navigation menu
    '#guide-content',
    '#guide-inner-content',
    'ytd-guide-renderer',
    'ytd-mini-guide-renderer',
    
    // Main content containers
    '#content',
    '#page-manager',
    
    // Watch page elements
    'ytd-watch-flexy',
    '#secondary',  // Side panel with recommendations
    '#related',    // Related videos section
    '#comments'    // Comments section
  ];
  

  private static readonly SELECTORS = [
   // Video player ad indicators (high priority)
   ".html5-video-player.ad-showing",
   ".ytp-ad-module",
   ".video-ads.ytp-ad-module",
   
   // Additional selectors targeting 2025 YouTube ad containers
    ".ytp-ad-text-overlay",
    ".ytp-ad-feedback-dialog-container",
    "#companion", // New companion ad container
    "#player-ads > .ytp-ad-module",
    "ytd-in-feed-ad-layout-renderer[class*='ad']",
    "ytd-action-companion-ad-renderer[system-icons]",
    "#masthead-ad", // Main page top banner ad
    "ytd-display-ad-renderer[id^='ad-slot']",
    "ytd-promoted-sparkles-web-renderer[slot-id]",
    "tp-yt-paper-dialog.ytd-mealbar-promo-renderer", // Special promo ads
   // New 2025 selectors
   ".ytp-ad-player-overlay-flyout-cta",
   ".ytp-ad-persistent-progress-bar-container",
   ".ytp-ad-player-overlay-instream-user-sentiment",
   
   // Ad renderers (regular priority)
   "ytd-display-ad-renderer",
   "ytd-ad-slot-renderer",
   "ytd-promoted-sparkles-web-renderer",
   "ytd-promoted-video-renderer",
   "ytd-rich-section-renderer[is-sponsored]",
   
   // New ad renderers
   "ytd-ad-persistent-companion-renderer",
   "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-ads']",
   "ytd-reel-player-overlay-renderer[use-ad-active-view-tracking]",
   
   // Attribute-based selectors (most reliable)
   '[aria-label="Advertisement"]',
   '[aria-label*="sponsored" i]',
   '[data-ad-format]',
   '[id^="ad-slot-"]',
   
   
    // Video player ad indicators
    ".html5-video-player.ad-showing",
    ".ytp-ad-module",
    ".video-ads.ytp-ad-module",
    
    // Specific ad renderers
    "ytd-display-ad-renderer",
    "ytd-ad-slot-renderer",
    "ytd-companion-slot-renderer",
    "ytd-action-companion-ad-renderer",
    "ytd-promoted-sparkles-web-renderer",
    "ytd-promoted-video-renderer",
    "ytd-banner-promo-renderer",
    "ytd-shopping-companion-ad-renderer",
    "ytd-statement-banner-renderer",
    "ytd-in-feed-ad-layout-renderer",
    
    // Overlay ads
    ".ytp-ad-overlay-slot",
    ".ytp-ad-overlay-container",
    ".ytp-ad-skip-button-slot",
    
    // Pre-roll ad elements
    ".ytp-ad-text",
    ".ytp-ad-preview-container",
    ".ytp-ad-skip-button",
    
    // Masthead ads
    "ytd-masthead-ad-v4-renderer",
    "#masthead-ad",
    
    // Accessibility attributes (highly reliable)
    '[aria-label="Advertisement"]',
    '[aria-label*="sponsored" i]',
    '[aria-label="Ad"]',
    
    // Child selectors (better performance)
    "ytd-watch-next-secondary-results-renderer > ytd-compact-promoted-video-renderer",
    "ytd-browse > ytd-ad-slot-renderer",
    "ytd-watch-flexy > #player-overlay[style*='display: block']",
    
    // Sponsored content
    ".ytd-sponsored-card-renderer",
    "ytd-rich-section-renderer[is-sponsored]",
    
    // Common ad elements
    ".ad-div",
    ".masthead-ad-control",
    ".ytp-ad-overlay-image",
    ".ytp-ad-progress",
    ".ytp-ad-skip-button-modern",
    
    // Playlist specific ads
    "ytd-playlist-panel-renderer > ytd-display-ad-renderer",
    "ytd-playlist-panel-renderer > .ad-container",
    
    // Player ads
    "#player-ads",
    "ytd-player-legacy-desktop-watch-ads-renderer",
    
    // Shopping ads
    "ytd-merch-shelf-renderer",
    "ytd-merchandise-shelf-renderer",
    "ytd-video-product-renderer"
  ];


  private bypassAntiAdblockDetection() {
    const script = document.createElement('script');
    const scriptContent = `
    (function() {
        // 1. Create a more sophisticated setTimeout interceptor
        const originalSetTimeout = window.setTimeout;
        window.setTimeout = function(callback, delay, ...args) {
            // Target anti-adblock detection timeouts with more specific conditions
            if ((delay > 2000 && delay <= 6000) && 
                (window.location.pathname.includes('/watch') || window.location.pathname === '/')) {
                // Identify anti-adblock functions by examining their code
                if (typeof callback === 'function') {
                    const fnStr = callback.toString().toLowerCase();
                    if (fnStr.includes('ad') || fnStr.includes('block') || fnStr.includes('detect')) {
                        console.log('[YouTube AdBlocker] Intercepted potential anti-adblock timer');
                        delay = 10; // Make it run immediately but we'll replace it
                        callback = function() {}; // Empty function
                    }
                }
            }
            return originalSetTimeout(callback, delay, ...args);
        };
        
        // 2. Enhanced ad property interception
        const adProperties = [
            'adBlocksFound', 'adBlocker', 'hasAdBlocker', 'showAds', 
            'adPlacements', 'adBreakServiceResponse', 'playerAds',
            'adModule', 'onAdStart', 'onAdComplete', 'adPlaying'
        ];
        
        // Apply to multiple objects
        const objects = [window, Object.prototype, HTMLElement.prototype];
        
        objects.forEach(obj => {
            adProperties.forEach(prop => {
                try {
                    Object.defineProperty(obj, prop, {
                        get: function() { 
                            return prop.includes('Block') ? false : (prop.includes('ad') ? [] : true); 
                        },
                        set: function() { return true; },
                        configurable: false
                    });
                } catch (e) {}
            });
        });
        
        // 3. More extensive API request interception
        const originalFetch = window.fetch;
        window.fetch = function(input, init) {
            if (typeof input === 'string') {
                // Handle player API requests
                if (input.includes('/youtubei/v1/player') || input.includes('/youtubei/v1/next')) {
                    if (init && init.body) {
                        try {
                            const body = JSON.parse(init.body.toString());
                            
                            // Clear multiple ad-related fields
                            if (body.adSignalsInfo) body.adSignalsInfo = null;
                            if (body.playbackContext?.adPlaybackContext) body.playbackContext.adPlaybackContext = null;
                            
                            // Additional field removals
                            if (body.context?.adSignalsInfo) body.context.adSignalsInfo = null;
                            
                            // Add fake premium status
                            if (body.context?.user) {
                                body.context.user.hasPlusPage = true;
                            }
                            
                            init.body = JSON.stringify(body);
                        } catch (e) {}
                    }
                }
            }
            return originalFetch.apply(this, arguments);
        };
        
        // 4. Override ad-related YouTube player functions
        if (window.YT && window.YT.Player) {
            const originalPlayerFunction = window.YT.Player;
            window.YT.Player = function() {
                const player = originalPlayerFunction.apply(this, arguments);
                // Override ad-related methods
                if (player) {
                    player.playAd = function() { return false; };
                    player.loadAd = function() { return false; };
                }
                return player;
            };
        }
    })();
    `;
    
    script.textContent = (window as any).trustedTypes?.defaultPolicy?.createScript(scriptContent)
        || scriptContent as string;
    appendElement(document.documentElement, script as HTMLElement);
    script.remove();
}

private skipVideoAds() {
    const videoPlayer = document.querySelector('.html5-video-player');
    if (videoPlayer?.classList.contains('ad-showing')) {
        // Existing skip button logic
        const skipButton = document.querySelector('.ytp-ad-skip-button-slot button, .ytp-skip-ad-button');
        
        // Enhanced for pre-roll and mid-roll ads
        if (skipButton) {
            (skipButton as HTMLElement).click();
            this.performanceTracker.logBlock();
        } else {
            // For unskippable ads
            const video = document.querySelector('video');
            if (video) {
                try {
                    // Try to skip to the end of the ad
                    (video as HTMLVideoElement).currentTime = (video as HTMLVideoElement).duration;
                    (video as HTMLVideoElement).playbackRate = 16.0;
                    
                    // Remove ad overlay containers
                    const adOverlays = document.querySelectorAll('.ytp-ad-player-overlay, .ytp-ad-persistent-progress-bar-container');
                    adOverlays.forEach(overlay => {
                        (overlay as HTMLElement).style.display = 'none';
                    });
                    
                    this.performanceTracker.logBlock();
                } catch (error) {
                    console.error('[AdBlocker] Error manipulating video:', error);
                }
            }
        }
    }
}




  private trackSelectorUsage(selector: string, matchCount: number): void {
    if (!this.debugMode) return;
    
    if (!this.selectorStats[selector]) {
      this.selectorStats[selector] = {attempts: 0, matches: 0};
    }
    
    this.selectorStats[selector].attempts++;
    this.selectorStats[selector].matches += matchCount;
  }

  public logSelectorStats(): void {
    if (Object.keys(this.selectorStats).length === 0) {
      console.log('[YouTube AdBlocker] No selector statistics available yet');
      return;
    }
    
    console.log('[YouTube AdBlocker] Selector effectiveness:');
    Object.entries(this.selectorStats)
      .sort((a, b) => b[1].matches - a[1].matches)
      .forEach(([selector, stats]) => {
        console.log(
          `${selector}: ${stats.matches} matches / ${stats.attempts} attempts ` +
          `(${Math.round(stats.matches/stats.attempts*100) || 0}% hit rate)`
        );
      });
  }

  private getElementInfo(element: Element): string {
    const id = element.id ? `#${element.id}` : '';
    const classes = Array.from(element.classList).map(c => `.${c}`).join('');
    const tagName = element.tagName.toLowerCase();
    return `${tagName}${id}${classes}`;
  }

  private storeRemovedElement(element: Element): void {
    if (this.removedElements.length > 100) {
      // Keep history manageable
      this.removedElements.shift();
    }
    
    const selector = this.getElementInfo(element);
    this.removedElements.push({
      element,
      selector,
      timestamp: Date.now()
    });
  }

  public toggleDebugMode(enable?: boolean): void {
    this.debugMode = enable !== undefined ? enable : !this.debugMode;
    console.log(`[YouTube AdBlocker] Debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
  }

  private validateSelectors(): void {
    YouTubeAdRemover.SELECTORS.forEach(selector => {
      try {
        document.querySelectorAll(selector);
      } catch (error) {
        this.invalidSelectors.push(selector);
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[YouTube AdBlocker] Invalid selector will be skipped: "${selector}" - ${errorMessage}`);
      }
    });
  }
  
}

// Expose the adblocker instance globally for debugging
declare global {
    interface Window {
      ytAdBlocker?: YouTubeAdRemover;
    }
  }
  
  // Initialize with DOMContentLoaded check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (location.hostname.includes('youtube.com')) {
        const adBlocker = new YouTubeAdRemover();
        (window as any).ytAdBlocker = adBlocker;
      }
    });
  } else {
    if (location.hostname.includes('youtube.com')) {
      const adBlocker = new YouTubeAdRemover();
      (window as any).ytAdBlocker = adBlocker;
    }
  }
  
