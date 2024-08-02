import React, { useEffect, useState, type ChangeEventHandler } from 'react';

export const App = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    // Get the initial value from chrome storage
    chrome.storage.local.get('enabled', (data) => {
      setEnabled(!!data.enabled);
    });

    // Listen for changes in chrome storage
    const handleStorageChange = (changes: {
      [key: string]: chrome.storage.StorageChange;
    }) => {
      if (changes.enabled) {
        setEnabled(!!changes.enabled.newValue);
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    // Cleanup listener on component unmount
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  const handleCheckboxChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    setEnabled(e.target.checked);
    chrome.storage.local.set({ enabled: e.target.checked });
  };

  return (
    <main className="container">
      <h2>Preferences:</h2>
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
    </main>
  );
};
