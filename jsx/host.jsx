/**
 * Flexio Host ExtendScript (host.jsx)
 * Executes in the Adobe application's JSX engine.
 *
 * All functions defined here are callable from the CEP panel via:
 *   csInterface.evalScript('functionName(args)')
 */

/* global $, File */

/**
 * Execute a script file in the host application.
 * Supports both .jsx (text) and .jsxbin (compiled binary) formats.
 *
 * @param {string} scriptPath  Absolute path to the script file (forward slashes).
 * @returns {string} "OK" on success, or "ERROR: <message>" on failure.
 */
function executeScript(scriptPath) {
  try {
    var scriptFile = new File(scriptPath)

    if (!scriptFile.exists) {
      return 'ERROR: Script not found: ' + scriptPath
    }

    // $.evalFile handles both .jsx and .jsxbin
    $.evalFile(scriptFile)
    return 'OK'
  } catch (e) {
    return 'ERROR: ' + e.message
  }
}

/**
 * Return basic information about the current host environment.
 * Useful for debugging from the panel.
 *
 * @returns {string} JSON string with appName, appVersion.
 */
function getHostInfo() {
  try {
    return JSON.stringify({
      appName: app.name,
      appVersion: app.version,
      scriptingVersion: $.version,
    })
  } catch (e) {
    return JSON.stringify({ error: e.message })
  }
}

/**
 * Dispatch a CSXS application-scope event via PlugPlugExternalObject.
 * Used to notify all panels that blueprints have changed.
 *
 * @param {string} eventType  The event type string, e.g. "com.flexio.blueprintsChanged"
 * @returns {string} "OK" on success, or "ERROR: <message>" on failure.
 */
function dispatchFlexioEvent(eventType) {
  try {
    new ExternalObject('lib:PlugPlugExternalObject') // eslint-disable-line no-new
    var event = new CSXSEvent()
    event.type = eventType
    event.scope = 'APPLICATION'
    event.data = ''
    event.dispatch()
    return 'OK'
  } catch (e) {
    return 'ERROR: ' + e.message
  }
}
