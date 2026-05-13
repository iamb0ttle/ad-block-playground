/*
Goal
- Remove all 4 mock ads with minimum and readable code.
- Avoid hard-coding each ad element one by one.
- Simulate a general ad blocker by using common ad signals:
  1. cosmetic selector rules
  2. URL / attribute keyword rules
  3. runtime DOM mutation tracking
- This is not a real browser-level network blocker.
- This is a small playground that mimics how ad blockers detect and hide ad surfaces in the browser runtime.
*/

(() => {
  const cosmeticRules = [
    '.ad-banner',
    '.sponsor-post',
    '[data-ad-slot]',
    '.lazyload-ad',
    '.ob-smart-feed',
    '.native-ad',
    '.promo-content',
    '[data-tracker]',
    'iframe[src*="ad" i]',
    'iframe[src*="promo" i]',
    'iframe[src*="track" i]',
  ];

  const adKeywords = [
    'ad',
    'ads',
    'advertisement',
    'banner',
    'sponsor',
    'sponsored',
    'promo',
    'doubleclick',
    'ad-delivery',
    'track',
    'tracker',
    'click',
    '728x90',
    '468x60',
    '300x250',
    '250x250',
  ];

  const containerSelector = [
    '.ad-banner',
    '.sponsor-post',
    '[data-ad-slot]',
    '.native-ad',
    '.promo-content',
    '[id*="ad" i]',
    '[class*="ad" i]',
    '[id*="promo" i]',
    '[class*="promo" i]',
    'iframe',
    'aside',
    'section',
    'div',
  ].join(',');

  const hasAdSignal = (element) => {
    const values = [
      element.id,
      element.className,
      element.getAttribute('src'),
      element.getAttribute('href'),
      element.getAttribute('alt'),
      element.getAttribute('title'),
      element.getAttribute('data-tracker'),
      element.getAttribute('data-ad-slot'),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return adKeywords.some((keyword) => values.includes(keyword));
  };

  const removeAd = (element, reason = 'ad signal') => {
    const target = element.closest(containerSelector) || element;

    if (!target || ['HTML', 'BODY'].includes(target.tagName)) return;
    if (target.dataset.adblockRemoved) return;

    target.dataset.adblockRemoved = 'true';
    console.log('[mini-adblock] removed:', reason, target);
    target.remove();
  };

  const isFloatingFrame = (element) => {
    if (!(element instanceof HTMLElement)) return false;

    const style = getComputedStyle(element);
    const zIndex = Number.parseInt(style.zIndex, 10) || 0;

    return (
      element.querySelector('iframe') &&
      ['fixed', 'sticky'].includes(style.position) &&
      zIndex >= 1000
    );
  };

  const scan = (root = document) => {
    if (root instanceof HTMLElement) {
      // 💡 정의된 함수명(isFloatingFrame)과 일치하도록 수정했습니다.
      if (isFloatingFrame(root)) {
        removeAd(root, 'floating iframe ad rule');
        return;
      }
    }

    cosmeticRules.forEach((selector) => {
      root.querySelectorAll?.(selector).forEach((element) => {
        removeAd(element, `cosmetic rule: ${selector}`);
      });
    });

    root.querySelectorAll?.('a, img, iframe, script, div, section, aside').forEach((element) => {
      if (hasAdSignal(element)) {
        removeAd(element, 'keyword rule');
      }
    });
  };

  scan();

  new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        if (hasAdSignal(node)) {
          removeAd(node, 'mutation keyword rule');
        }

        scan(node);
      });
    });
  }).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();