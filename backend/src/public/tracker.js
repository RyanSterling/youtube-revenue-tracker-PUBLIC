/**
 * YouTube Tracker - Custom Landing Page Integration
 *
 * Usage:
 * 1. Include this script on your landing page:
 *    <script src="https://your-api.com/tracker.js"></script>
 *
 * 2. Initialize with your API URL:
 *    <script>
 *      YTTracker.init({ apiUrl: 'https://your-api.com' });
 *    </script>
 *
 * 3. Track conversions on your checkout success page:
 *    YTTracker.trackConversion({
 *      offerSlug: 'my-course',
 *      email: 'customer@email.com',
 *      revenue: 99.00,
 *      transactionId: 'txn_123' // optional, prevents duplicates
 *    });
 *
 * 4. Track freebie signups:
 *    YTTracker.trackFreebie({
 *      offerSlug: 'free-guide',
 *      email: 'subscriber@email.com'
 *    });
 */

(function (window) {
  'use strict';

  var STORAGE_KEY = 'yt_tracker_vid';
  var COOKIE_NAME = 'yt_vid';
  var COOKIE_DAYS = 30;

  var YTTracker = {
    config: {
      apiUrl: null,
      debug: false,
    },

    /**
     * Initialize the tracker
     * @param {Object} options - { apiUrl: string, debug?: boolean }
     */
    init: function (options) {
      if (!options || !options.apiUrl) {
        console.error('[YTTracker] apiUrl is required');
        return;
      }

      this.config.apiUrl = options.apiUrl.replace(/\/$/, ''); // Remove trailing slash
      this.config.debug = options.debug || false;

      // Capture visitor_id from URL params on page load
      this._captureVisitorId();

      this._log('Initialized', this.config);
    },

    /**
     * Get the current visitor ID
     * @returns {string|null}
     */
    getVisitorId: function () {
      // Priority: URL param > cookie > localStorage
      var urlVid = this._getUrlParam('vid');
      if (urlVid) {
        this._storeVisitorId(urlVid);
        return urlVid;
      }

      return (
        this._getCookie(COOKIE_NAME) ||
        this._getLocalStorage(STORAGE_KEY) ||
        null
      );
    },

    /**
     * Track a conversion (purchase)
     * @param {Object} data - { offerSlug, email, revenue, transactionId? }
     * @returns {Promise}
     */
    trackConversion: function (data) {
      if (!this.config.apiUrl) {
        console.error('[YTTracker] Not initialized. Call init() first.');
        return Promise.reject(new Error('Not initialized'));
      }

      if (!data.offerSlug) {
        console.error('[YTTracker] offerSlug is required');
        return Promise.reject(new Error('offerSlug is required'));
      }

      if (!data.email) {
        console.error('[YTTracker] email is required');
        return Promise.reject(new Error('email is required'));
      }

      var payload = {
        offer_slug: data.offerSlug,
        email: data.email,
        revenue: parseFloat(data.revenue) || 0,
        visitor_id: this.getVisitorId(),
        external_transaction_id: data.transactionId || null,
      };

      this._log('Tracking conversion', payload);

      return this._fetch(this.config.apiUrl + '/api/conversions/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(
          function (result) {
            this._log('Conversion tracked', result);
            return result;
          }.bind(this)
        )
        .catch(function (error) {
          console.error('[YTTracker] Failed to track conversion', error);
          throw error;
        });
    },

    /**
     * Track a freebie conversion (lead magnet signup)
     * @param {Object} data - { offerSlug, email, source?, campaign? }
     * @returns {Promise}
     */
    trackFreebie: function (data) {
      if (!this.config.apiUrl) {
        console.error('[YTTracker] Not initialized. Call init() first.');
        return Promise.reject(new Error('Not initialized'));
      }

      if (!data.offerSlug) {
        console.error('[YTTracker] offerSlug is required');
        return Promise.reject(new Error('offerSlug is required'));
      }

      if (!data.email) {
        console.error('[YTTracker] email is required');
        return Promise.reject(new Error('email is required'));
      }

      var payload = {
        offer_slug: data.offerSlug,
        email: data.email,
        visitor_id: this.getVisitorId(),
        source: data.source || null,
        campaign: data.campaign || null,
        page_url: window.location.href,
        referrer: document.referrer || null,
      };

      this._log('Tracking freebie', payload);

      return this._fetch(this.config.apiUrl + '/api/freebie-conversion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then(
          function (result) {
            this._log('Freebie tracked', result);
            return result;
          }.bind(this)
        )
        .catch(function (error) {
          console.error('[YTTracker] Failed to track freebie', error);
          throw error;
        });
    },

    // ============ Private Methods ============

    _captureVisitorId: function () {
      var vid = this._getUrlParam('vid');
      if (vid) {
        this._storeVisitorId(vid);
        this._log('Captured visitor_id from URL', vid);
      }
    },

    _storeVisitorId: function (vid) {
      // Store in both cookie and localStorage for redundancy
      this._setCookie(COOKIE_NAME, vid, COOKIE_DAYS);
      this._setLocalStorage(STORAGE_KEY, vid);
    },

    _getUrlParam: function (name) {
      var params = new URLSearchParams(window.location.search);
      return params.get(name);
    },

    _setCookie: function (name, value, days) {
      var expires = new Date();
      expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
      document.cookie =
        name +
        '=' +
        value +
        ';expires=' +
        expires.toUTCString() +
        ';path=/;SameSite=Lax';
    },

    _getCookie: function (name) {
      var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    },

    _setLocalStorage: function (key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        // localStorage might be blocked
      }
    },

    _getLocalStorage: function (key) {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        return null;
      }
    },

    _fetch: function (url, options) {
      return fetch(url, options).then(function (response) {
        return response.json();
      });
    },

    _log: function () {
      if (this.config.debug) {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[YTTracker]');
        console.log.apply(console, args);
      }
    },
  };

  // Expose globally
  window.YTTracker = YTTracker;
})(window);
