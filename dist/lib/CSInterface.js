/**
 * CSInterface.js — Minimal implementation for Flexio (CEP 12)
 *
 * The real CSInterface.js from Adobe is MIT licensed and available at:
 *   https://github.com/Adobe-CEP/CEP-Resources
 *
 * The install-ext.js script will automatically copy the real version from:
 *   C:\Program Files (x86)\Common Files\Adobe\CEP\resources\CSInterface.js
 *
 * This file serves as a fallback stub so the extension loads without errors
 * even if the copy step was skipped.
 */

(function () {
  'use strict';

  // Guard: If already loaded (real version), skip
  if (typeof window.CSInterface !== 'undefined') return;

  var SystemPath = {
    USER_DATA: 'userData',
    APPLICATION: 'application',
    EXTENSION: 'extension',
    EXTENSION_DATA: 'extensionData',
    HOST_APPLICATION: 'hostApplication',
    ROAMING_APPLICATION_DATA: 'roamingAppData',
    COMMON_FILES: 'commonFiles',
    MY_DOCUMENTS: 'myDocuments',
    APPLICATION_64: 'application64',
    SYSTEM_KEYCHAIN: 'systemKeychain',
  };

  function CSEvent(type, scope, appId, extensionId) {
    this.type = type;
    this.scope = scope || 'APPLICATION';
    this.appId = appId || 'UNKNOWN';
    this.extensionId = extensionId || '';
    this.data = '';
  }

  /**
   * CSInterface wraps window.__adobe_cep__ — the native CEP object
   * injected into every CEP panel by the Adobe runtime.
   */
  function CSInterface() {
    this._native = window.__adobe_cep__ || null;
  }

  CSInterface.prototype.getHostEnvironment = function () {
    if (this._native) {
      try { return JSON.parse(this._native.getHostEnvironment()); } catch (e) {}
    }
    return { appName: 'AEFT', appVersion: '25.0', appLocale: 'en_US' };
  };

  CSInterface.prototype.getExtensionID = function () {
    if (this._native) {
      try {
        var raw = this._native.getExtensionId();
        // Some CEP versions return the ID wrapped in quotes
        return raw.replace(/^"|"$/g, '');
      } catch (e) {}
    }
    return 'com.flexio.panel1';
  };

  CSInterface.prototype.getSystemPath = function (pathType) {
    if (this._native) {
      try {
        var path = decodeURI(this._native.getSystemPath(pathType));
        // Strip file:// protocol prefix (matching real CSInterface.js)
        path = path.replace(/^file:\/{3}/, '').replace(/^file:\/{2}/, '');
        return path;
      } catch (e) {}
    }
    return '';
  };

  CSInterface.prototype.evalScript = function (script, callback) {
    if (this._native) {
      this._native.evalScript(script, callback || function () {});
    } else {
      if (callback) callback('undefined');
    }
  };

  CSInterface.prototype.addEventListener = function (type, listener) {
    if (this._native) {
      this._native.addEventListener(type, listener);
    }
  };

  CSInterface.prototype.removeEventListener = function (type, listener) {
    if (this._native) {
      this._native.removeEventListener(type, listener);
    }
  };

  CSInterface.prototype.dispatchEvent = function (event) {
    if (this._native) {
      this._native.dispatchEvent(JSON.stringify(event));
    }
  };

  CSInterface.prototype.requestOpenExtension = function (extensionId, params) {
    if (this._native) {
      this._native.requestOpenExtension(extensionId, params);
    }
  };

  CSInterface.prototype.closeExtension = function () {
    if (this._native) {
      this._native.closeExtension();
    }
  };

  CSInterface.prototype.getApplicationSkinInfo = function () {
    if (this._native) {
      try { return JSON.parse(this._native.getSkinInfo()); } catch (e) {}
    }
    return null;
  };

  // Expose globally
  window.CSInterface = CSInterface;
  window.CSEvent = CSEvent;
  window.SystemPath = SystemPath;

})();
