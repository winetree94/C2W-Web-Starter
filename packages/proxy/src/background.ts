chrome.runtime.onMessageExternal.addListener(async (request, sender, sendResponse) => {
  if (request.type !== 'fetch') {
    return sendResponse({
      type: 'error',
      error: 'Invalid request type',
    });
  }

  try {
    const res = await fetch(request.url, request.options);
    const headers: {
      [key: string]: string;
    } = {};
    res.headers.forEach((value, key) => {
      headers[key] = value;
    });
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const blob = new TextDecoder().decode(bytes);
    console.log('request url: ', request.url);
    sendResponse({
      type: 'response',
      status: res.status,
      statusText: res.statusText,
      headers: headers,
      responseBuffer: blob,
    });
  } catch (error) {
    sendResponse({
      type: 'error',
      error: error,
    });
  }
});
