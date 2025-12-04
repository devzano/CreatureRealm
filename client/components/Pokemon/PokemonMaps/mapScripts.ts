// components/PokemonMaps/mapScripts.ts

export const FULLSCREEN_HACK_JS = `
  (function () {
    function cleanAdsAndVideos(wrapper) {
      try {
        var videos = document.querySelectorAll('video');
        videos.forEach(function (v) {
          try {
            v.pause();
            v.muted = true;
            v.autoplay = false;
            v.removeAttribute('autoplay');
            v.style.setProperty('display', 'none', 'important');
            v.style.setProperty('visibility', 'hidden', 'important');
            v.style.setProperty('opacity', '0', 'important');
          } catch (e) {}
        });

        try {
          var VideoProto = window.HTMLVideoElement && window.HTMLVideoElement.prototype;
          if (VideoProto) {
            ['requestFullscreen', 'webkitRequestFullscreen', 'mozRequestFullScreen', 'msRequestFullscreen'].forEach(function (fn) {
              if (VideoProto[fn]) {
                VideoProto[fn] = function () {
                  return Promise.resolve && Promise.resolve();
                };
              }
            });
          }
        } catch (e) {}

        var selectorsToHide = [
          'iframe[src*="ad"]',
          'iframe[src*="doubleclick"]',
          'iframe[src*="googlesyndication"]',
          'iframe[src*="ads"]',
          'iframe[src*="video"]',
          '[id*="ad"]',
          '[class*="ad-"]',
          '[class*="advert"]',
          '[class*="banner"]',
          '[class*="adsense"]',
          '[id*="overlay"]',
          '[class*="overlay"]',
          '[class*="popup"]',
          '[id*="popup"]',
          '[class*="modal"]',
          '[id*="modal"]',
          '[class*="cookie"]',
          '[id*="cookie"]',
          '[class*="consent"]',
          '[id*="consent"]',
          '[role="dialog"]'
        ];

        selectorsToHide.forEach(function (sel) {
          try {
            var nodes = document.querySelectorAll(sel);
            nodes.forEach(function (el) {
              if (wrapper && (el.contains(wrapper) || wrapper.contains(el))) return;
              el.style.setProperty('display', 'none', 'important');
              el.style.setProperty('visibility', 'hidden', 'important');
              el.style.setProperty('opacity', '0', 'important');
              el.style.setProperty('pointerEvents', 'none', 'important');
            });
          } catch (e) {}
        });
      } catch (e) {}
    }

    function maximizeLayout() {
      try {
        var wrapper = document.getElementById('map-wrapper');
        if (!wrapper) {
          cleanAdsAndVideos(null);
          return;
        }

        var mapRoot =
          wrapper.querySelector('.maplibregl-map') ||
          wrapper.querySelector('#map') ||
          wrapper;

        var root = wrapper;
        while (
          root.parentElement &&
          root.parentElement.tagName.toLowerCase() !== 'body'
        ) {
          root = root.parentElement;
        }

        Array.prototype.forEach.call(document.body.children, function (child) {
          if (child !== root) {
            child.style.display = 'none';
          }
        });

        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.documentElement.style.margin = '0';
        document.documentElement.style.padding = '0';
        document.documentElement.style.backgroundColor = '#000';
        document.body.style.backgroundColor = '#000';
        document.body.style.overflow = 'hidden';

        root.style.margin = '0';
        root.style.padding = '0';
        root.style.width = '100vw';
        root.style.maxWidth = '100vw';
        root.style.height = '100vh';
        wrapper.style.width = '100vw';
        wrapper.style.height = '100vh';

        if (mapRoot) {
          mapRoot.style.position = 'relative';
          mapRoot.style.width = '100vw';
          mapRoot.style.height = '100vh';
          mapRoot.style.maxWidth = '100vw';
          mapRoot.style.maxHeight = '100vh';
          mapRoot.style.overflow = 'hidden';
        }

        var canvasContainer =
          (mapRoot && mapRoot.querySelector('.maplibregl-canvas-container')) ||
          (mapRoot && mapRoot.querySelector('canvas'));
        if (canvasContainer) {
          canvasContainer.style.width = '100%';
          canvasContainer.style.height = '100%';
        }

        wrapper.scrollIntoView({ behavior: 'instant', block: 'start' });

        try {
          var fsBtn = document.querySelector('button.maplibregl-ctrl-fullscreen');
          if (fsBtn) {
            fsBtn.style.setProperty('display', 'none', 'important');
          }
        } catch (e) {}

        cleanAdsAndVideos(wrapper);
      } catch (e) {}
    }

    function run() {
      maximizeLayout();

      var attempts = 0;
      var maxAttempts = 30;
      var interval = setInterval(function () {
        attempts++;
        maximizeLayout();
        if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 500);
    }

    run();
  })();
  true;
`;

// ---- Map control helpers ----

export const MAP_CONTROL_HELPERS_JS = `
  (function () {
    function getForm() {
      return document.getElementById('cat-control');
    }

    function triggerChange(el) {
      if (!el) return;
      var evt = new Event('change', { bubbles: true });
      el.dispatchEvent(evt);
    }

    // Always fire a change event, even if the value didn't change.
    function setChecked(el, checked) {
      if (!el) return;
      el.checked = !!checked;
      triggerChange(el);
    }

    function getChecked(el) {
      return !!(el && el.checked);
    }

    function getCheckbox(selector) {
      var form = getForm();
      if (!form) return null;
      try {
        return form.querySelector(selector);
      } catch (e) {
        return null;
      }
    }

    function clickElement(selector) {
      var form = getForm();
      if (!form) return;
      var el = form.querySelector(selector);
      if (el && typeof el.click === 'function') {
        el.click();
      }
    }

    // Core controls
    function setHideAll(checked) {
      var cb = getCheckbox('input[name="hide-all"]');
      setChecked(cb, checked);
    }

    function setCountsVisible(checked) {
      var cb = getCheckbox('input[name="show-counts"]');
      setChecked(cb, checked);
    }

    function setLabelsVisible(checked) {
      var cb = getCheckbox('input[name="show-labels"]');
      setChecked(cb, checked);
    }

    function setBookmarkFollow(checked) {
      var cb = getCheckbox('#map-bookmark input[name="follow"]');
      setChecked(cb, checked);
    }

    function setMyCollected(checked) {
      var cb = getCheckbox('#map-my-collected input[name="collected"]');
      setChecked(cb, checked);
    }

    function resetMyCollected() {
      clickElement('#map-my-collected-reset');
    }

    // Map menu visibility (dropdown menu)
    function setMapMenuVisible(visible) {
      var cb = getCheckbox('#map-menu input[name="show-maps"]');
      setChecked(cb, visible);
    }

    // Parent categories
    function setParentCategory(value, checked) {
      var selector = 'input[name="cat[]"][value="' + value + '"]';
      var cb = getCheckbox(selector);
      setChecked(cb, checked);
    }

    function setParentCategories(values, checked) {
      if (!Array.isArray(values)) return;
      values.forEach(function (v) { setParentCategory(v, checked); });
    }

    // Subcategories
    function setSubCategory(value, checked) {
      var selector = 'input[name="subcat[]"][value="' + value + '"]';
      var cb = getCheckbox(selector);
      setChecked(cb, checked);
    }

    function setSubCategories(values, checked) {
      if (!Array.isArray(values)) return;
      values.forEach(function (v) { setSubCategory(v, checked); });
    }

    // Items (name="item[]")
    function setItem(value, checked) {
      var selector = 'input[name="item[]"][value="' + value + '"]';
      var cb = getCheckbox(selector);
      setChecked(cb, checked);
    }

    function setItems(values, checked) {
      if (!Array.isArray(values)) return;
      values.forEach(function (v) { setItem(v, checked); });
    }

    // All parents
    function setAllParents(checked) {
      var form = getForm();
      if (!form) return;
      var nodes = form.querySelectorAll('input[name="cat[]"]');
      nodes.forEach(function (cb) {
        setChecked(cb, checked);
      });
    }

    // All subcategories
    function setAllSubCategories(checked) {
      var form = getForm();
      if (!form) return;
      var nodes = form.querySelectorAll('input[name="subcat[]"]');
      nodes.forEach(function (cb) {
        setChecked(cb, checked);
      });
    }

    // Read state
    function getState() {
      var form = getForm();
      if (!form) return null;

      function getAllCheckedValues(name) {
        var out = [];
        form.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (cb) {
          if (cb && typeof cb.value === 'string') {
            out.push(cb.value);
          }
        });
        return out;
      }

      var state = {
        hideAll: getChecked(getCheckbox('input[name="hide-all"]')),
        showCounts: getChecked(getCheckbox('input[name="show-counts"]')),
        showLabels: getChecked(getCheckbox('input[name="show-labels"]')),
        bookmarkFollow: getChecked(getCheckbox('#map-bookmark input[name="follow"]')),
        myCollected: getChecked(getCheckbox('#map-my-collected input[name="collected"]')),
        parentCategories: getAllCheckedValues('cat[]'),
        subCategories: getAllCheckedValues('subcat[]'),
        items: getAllCheckedValues('item[]')
      };

      return state;
    }

    function sendStateToReactNative() {
      var state = getState();
      if (!state) return;
      if (!window.ReactNativeWebView || !window.ReactNativeWebView.postMessage) return;
      try {
        window.ReactNativeWebView.postMessage(
          JSON.stringify({
            type: 'GG_MAP_STATE',
            payload: state
          })
        );
      } catch (e) {}
    }

    function attachFormListener() {
      var form = getForm();
      if (!form) return;
      if (form.__crListenerAttached) return;
      form.__crListenerAttached = true;
      form.addEventListener('change', function () {
        sendStateToReactNative();
      });
    }

    var api = {
      setHideAll: setHideAll,
      setCountsVisible: setCountsVisible,
      setLabelsVisible: setLabelsVisible,
      setBookmarkFollow: setBookmarkFollow,
      setMyCollected: setMyCollected,
      resetMyCollected: resetMyCollected,
      setMapMenuVisible: setMapMenuVisible,
      setParentCategory: setParentCategory,
      setParentCategories: setParentCategories,
      setSubCategory: setSubCategory,
      setSubCategories: setSubCategories,
      setItem: setItem,
      setItems: setItems,
      setAllParents: setAllParents,
      setAllSubCategories: setAllSubCategories,
      getState: getState,
      sendStateToReactNative: sendStateToReactNative
    };

    function init() {
      var attempts = 0;
      var maxAttempts = 40;
      var interval = setInterval(function () {
        var form = getForm();
        attempts++;
        if (form) {
          clearInterval(interval);
          attachFormListener();
          // Just sync initial state back to React Native; no auto "Hide All"
          sendStateToReactNative();
        }
        if (attempts >= maxAttempts) {
          clearInterval(interval);
        }
      }, 400);
    }

    // Expose API
    window.CRMapControls = api;
    init();
  })();
  true;
`;

// Helper to safely run CRMapControls from RN
export function buildCRMapScript(body: string): string {
  return `
    (function () {
      if (!window.CRMapControls) return;
      ${body}
    })();
    true;
  `;
}
