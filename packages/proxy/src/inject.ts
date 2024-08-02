interface FetcherSuccessResult {
  type: 'response';
  status: number;
  statusText: string;
  headers: {
    [key: string]: string;
  };
  responseBuffer: string;
}

interface FetcherErrorResult {
  type: 'error';
  error: string;
}

function toResponse(
  arrayBuffer: ArrayBuffer,
  headers: {
    [key: string]: string;
  },
  status: number,
  statusText: string,
) {
  const responseInit: ResponseInit = {
    status: status,
    statusText: statusText,
    headers: headers,
  };
  console.log('response init: ', arrayBuffer, responseInit);
  const response = new Response(
    arrayBuffer.byteLength ? arrayBuffer : null,
    responseInit,
  );
  return response;
}

const targetExtensionId = 'nodiojpmbjdaigdodafoihffiaogoagl';
let installed: boolean | null = null;

const checkExtension = (id: string, src: string): Promise<boolean> => {
  if (installed !== null) {
    return Promise.resolve<boolean>(installed);
  }
  return new Promise((resolve) => {
    const e = new Image();
    e.src = 'chrome-extension://' + id + '/' + src;
    e.onload = () => {
      resolve(true);
      installed = true;
      console.log('extension installed');
    };
    e.onerror = () => {
      resolve(false);
      installed = false;
      console.log('extension not installed');
    };
  });
};

const isEnabled = (): Promise<boolean> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      targetExtensionId,
      {
        type: 'get-enabled',
      },
      (res: boolean) => {
        return resolve(res);
      },
    );
  });
};

const originFetch = window.fetch;
window.fetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  const installed = await checkExtension(targetExtensionId, 'icon.svg');
  if (!installed) {
    return originFetch(url, options);
  }
  const enabled = await isEnabled();
  console.log('enabled: ', enabled);
  if (!enabled) {
    return originFetch(url, options);
  }

  return new Promise<Response>((resolve, reject) => {
    chrome.runtime.sendMessage(
      targetExtensionId,
      {
        type: 'fetch',
        url: url,
        options: options,
      },
      (rawRes: FetcherSuccessResult | FetcherErrorResult) => {
        if (rawRes.type === 'error') {
          return reject(rawRes.error);
        }
        console.log('raw res: ', rawRes);
        const byteArray = new TextEncoder().encode(rawRes.responseBuffer);
        const buffer = byteArray.buffer;
        const res = toResponse(
          buffer,
          rawRes.headers,
          rawRes.status,
          rawRes.statusText,
        );
        return resolve(res);
      },
    );
  });
};
