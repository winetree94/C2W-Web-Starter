chrome.runtime.onInstalled.addListener(() => {
  const rule: chrome.declarativeNetRequest.Rule = {
    id: 1,
    priority: 1,
    action: {
      type: chrome.declarativeNetRequest.RuleActionType.MODIFY_HEADERS,
      responseHeaders: [
        {
          header: "Access-Control-Allow-Headers",
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, If-Modified-Since",
        },
        {
          header: "Access-Control-Allow-Origin",
          operation: chrome.declarativeNetRequest.HeaderOperation.SET,
          value: "*",
        }
      ]
    },
    condition: {
      isUrlFilterCaseSensitive: true,
      regexFilter: ".*",
      resourceTypes: [
        chrome.declarativeNetRequest.ResourceType.MAIN_FRAME,
        chrome.declarativeNetRequest.ResourceType.SUB_FRAME,
        chrome.declarativeNetRequest.ResourceType.STYLESHEET,
        chrome.declarativeNetRequest.ResourceType.SCRIPT,
        chrome.declarativeNetRequest.ResourceType.IMAGE,
        chrome.declarativeNetRequest.ResourceType.FONT,
        chrome.declarativeNetRequest.ResourceType.OBJECT,
        chrome.declarativeNetRequest.ResourceType.XMLHTTPREQUEST,
        chrome.declarativeNetRequest.ResourceType.PING,
        chrome.declarativeNetRequest.ResourceType.CSP_REPORT,
        chrome.declarativeNetRequest.ResourceType.MEDIA,
        chrome.declarativeNetRequest.ResourceType.WEBSOCKET,
        chrome.declarativeNetRequest.ResourceType.OTHER,
      ]
    }
  };

  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [rule],
    removeRuleIds: [1]
  }, () => {
    console.log("Rule added to modify response headers");
  });
});
