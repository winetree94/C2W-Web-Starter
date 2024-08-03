import { DEFAULT_ENABLED_SITES, DEFAULT_EXTENSION_ENABLED } from '../constants';
import { useEffect, useState, type ChangeEventHandler } from 'react';

export const Settings = () => {
  const [enabled, setEnabled] = useState(false);
  const [sites, setSites] = useState<string[]>([]);

  useEffect(() => {
    chrome.storage.local.get(
      {
        enabled: DEFAULT_EXTENSION_ENABLED,
        sites: DEFAULT_ENABLED_SITES,
      },
      (data) => {
        setEnabled(!!data.enabled);
        setSites(data.sites || []);
      },
    );

    const handleStorageChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.enabled) {
        setEnabled(!!changes.enabled.newValue);
      }
      if (changes.sites) {
        setSites(changes.sites.newValue || []);
      }
    };

    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleCheckboxChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setEnabled(e.target.checked);
    chrome.storage.local.set({ enabled: e.target.checked });
  };

  const handleRemoveSite = (site: string) => {
    const newState = sites.filter((s) => s !== site);
    setSites(newState);
    chrome.storage.local.set({ sites: newState });
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const newSite = formData.get('text') as string;
    const newState = [...sites, newSite];
    setSites(newState);
    chrome.storage.local.set({ sites: newState });
    form.reset();
  };

  return (
    <main className="container">
      <section>
        <h2>Preferences</h2>
        <fieldset>
          <label>
            <input
              id="enabled"
              type="checkbox"
              name="english"
              checked={enabled}
              onChange={handleCheckboxChange}
            />
            Enable
          </label>
        </fieldset>

        <h5>Registered Host</h5>
        {sites.map((site) => (
          <fieldset style={{ display: 'flex' }} key={site}>
            <input
              type="text"
              name="text"
              placeholder="Text"
              aria-label="Text"
              value={site}
              disabled
            />
            <button
              className="secondary"
              style={{ marginLeft: '20px' }}
              onClick={() => handleRemoveSite(site)}
            >
              Remove
            </button>
          </fieldset>
        ))}
        <fieldset>
          <form onSubmit={onSubmit}>
            <h5>New Host</h5>
            <input
              type="text"
              name="text"
              placeholder="Text"
              aria-label="Text"
            />
          </form>
        </fieldset>
      </section>
    </main>
  );
};
