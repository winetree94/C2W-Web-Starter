interface GetEnableRequestMessage {
  type: 'get-enabled';
}

interface FetchRequestMessage {
  type: 'fetch';
  url: string | URL | Request;
  options: RequestInit;
}

type RequestMessage = GetEnableRequestMessage | FetchRequestMessage;

let enabled: boolean = false;

chrome.storage.local.get('enabled', (data) => {
  enabled = !!data.enabled;
  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) {
      enabled = !!changes.enabled.newValue;
    }
  });
  chrome.runtime.onMessageExternal.addListener(
    async (request: RequestMessage, sender, sendResponse) => {
      if (request.type === 'get-enabled') {
        sendResponse(enabled);
        return;
      }

      if (request.type !== 'fetch') {
        sendResponse({
          type: 'error',
          error: 'Invalid request type',
        });
        return;
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

        console.log('Request URL:', request.url);
        console.log('Response Status:', res.status, res.statusText);
        console.log('Response Headers:', headers);

        sendResponse({
          type: 'response',
          status: res.status,
          statusText: res.statusText,
          headers: headers,
          responseBuffer: blob,
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (error: any) {
        console.error('Fetch error:', error);
        sendResponse({
          type: 'error',
          error: error.message || error,
        });
      }

      return true;
    },
  );
});
