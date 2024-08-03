import { DEFAULT_ENABLED_SITES, DEFAULT_EXTENSION_ENABLED } from './constants';

interface GetEnableRequestMessage {
  type: 'get-enabled';
}

interface GetEnabledSitesMessage {
  type: 'get-enabled-sites';
}

interface FetchRequestMessage {
  type: 'fetch';
  url: string | URL | Request;
  options: RequestInit;
}

type RequestMessage =
  | GetEnableRequestMessage
  | GetEnabledSitesMessage
  | FetchRequestMessage;

let enabled: boolean = false;
let sites: string[] = [];

chrome.storage.local.get(
  {
    enabled: DEFAULT_EXTENSION_ENABLED,
    sites: DEFAULT_ENABLED_SITES,
  },
  (data) => {
    enabled = !!data.enabled;
    sites = data.sites || [];

    chrome.storage.onChanged.addListener((changes) => {
      if (changes.enabled) {
        enabled = !!changes.enabled.newValue;
      }
      if (changes.sites) {
        sites = changes.sites.newValue || [];
      }
    });

    chrome.runtime.onMessageExternal.addListener(
      async (request: RequestMessage, sender, sendResponse) => {
        if (request.type === 'get-enabled') {
          sendResponse(enabled);
          return;
        }

        if (request.type === 'get-enabled-sites') {
          sendResponse(sites);
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
          console.log('Request URL:', request.url);
          console.log('Request options:', request.options);

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
  },
);
