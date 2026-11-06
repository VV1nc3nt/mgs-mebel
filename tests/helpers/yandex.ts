import type { BrowserContext } from '@playwright/test'

/** No live Maps/Metrika request is allowed in browser tests, even with consent accepted. */
const METRIKA = `window.__metrikaCalls = [];
window.ym = function() { window.__metrikaCalls.push(Array.from(arguments)); };`

const MAPS = `
window.__mapInstances = [];
class YMap {
  constructor(element, props) {
    this.element = element; this.props = props; this.zoom = props.location.zoom || 9;
    this.center = [37.5,55.5];
    this.projection = { toWorldCoordinates: (p) => ({x:p[0],y:p[1]}), fromWorldCoordinates: (p) => [p.x,p.y] };
    this.bounds = props.location.bounds || [[36,54],[39,57]];
    this.element.dataset.sdkReady = 'true';
    window.__mapInstances.push(this);
    const attribution = document.createElement('a');
    attribution.textContent = 'Яндекс Карты ©';
    attribution.href = 'https://yandex.ru/maps/';
    attribution.dataset.mapAttribution = '';
    attribution.style.cssText = 'position:absolute;top:8px;left:8px;min-height:44px;display:flex;align-items:center';
    element.append(attribution);
  }
  addChild(child) {
    if (child.element) {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'position:absolute;left:' + (18 + (this.element.querySelectorAll("button").length * 20)) + '%;top:20%';
      wrapper.append(child.element); this.element.append(wrapper);
    }
    if (child.onStateChanged) child.onStateChanged({ getLayerState: () => ({tilesReady:1}) });
    return this;
  }
  update(props) { Object.assign(this.props, props); }
  setLocation(location) { if (location.zoom) this.zoom = location.zoom; this.lastLocation = location; }
  destroy() { this.destroyed = true; this.element.replaceChildren(); }
}
class YMapMarker { constructor(props, element) { this.props = props; this.element = element; } }
window.ymaps3 = {
  ready: Promise.resolve(), YMap, YMapMarker,
  YMapDefaultSchemeLayer: class {}, YMapDefaultFeaturesLayer: class {},
  YMapListener: class { constructor(props) { Object.assign(this, props); } }
};`

export async function stubYandex(context: BrowserContext): Promise<void> {
  await context.route(
    /^https:\/\/(?:[^/]+\.)?(?:yandex\.(?:ru|com)|yandex\.net|yastatic\.net|yandex\.com\.tr)\//,
    async (route) => {
      const url = new URL(route.request().url())
      if (url.hostname === 'mc.yandex.ru' && url.pathname === '/metrika/tag.js') {
        return route.fulfill({ contentType: 'application/javascript', body: METRIKA })
      }
      if (url.hostname === 'api-maps.yandex.ru' && url.pathname === '/v3/') {
        return route.fulfill({ contentType: 'application/javascript', body: MAPS })
      }
      await route.abort()
    },
  )
}
