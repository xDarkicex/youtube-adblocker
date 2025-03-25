class YouTubeAdRemover {
    private static readonly SELECTORS = [
      '.ytp-ad-module',
      '.ad-showing',
      '[class*="ad-" i]',
      'ytd-display-ad-renderer'
    ];
  
    private observer: MutationObserver;
  
    constructor() {
      this.observer = new MutationObserver(this.throttle(this.removeAds));
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
      });
      setInterval(this.removeAds.bind(this), 1500);
    }
  
    private throttle(fn: Function) {
      let waiting = false;
      return () => {
        if (!waiting) {
          requestAnimationFrame(() => {
            fn();
            waiting = false;
          });
          waiting = true;
        }
      };
    }
  
    private removeAds() {
      this.SELECTORS.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          if (!el.closest('#movie_player')) {
            el.remove();
            PerformanceTracker.getInstance().logBlock();
          }
        });
      });
    }
  }
  
  // Initialize
  if (location.host.includes('youtube.com')) {
    new YouTubeAdRemover();
  }