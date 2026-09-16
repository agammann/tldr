const status = document.querySelector('#status');
const button = document.querySelector('#capture');
await chrome.storage.local.setAccessLevel({ accessLevel: 'TRUSTED_CONTEXTS' });
let { pairing } = await chrome.storage.local.get('pairing');
status.textContent = pairing ? 'Ready. Open a signup or terms page and capture it.' : 'Connect your local MCP below to begin.';
document.querySelector('#pair').addEventListener('change', async event => {
  try {
    const file = event.target.files[0];
    if (!file || file.size > 4096) throw new Error('Choose the small pairing.json file created by the MCP.');
    const value = JSON.parse(await file.text());
    if (value.endpoint !== 'http://127.0.0.1:43187' || !/^[a-f0-9]{64}$/.test(value.token)) throw new Error('This is not a valid pairing file.');
    pairing = { endpoint: value.endpoint, token: value.token };
    await chrome.storage.local.set({ pairing });
    status.textContent = 'Connected settings saved. Capture this page to send it.';
  } catch (error) { status.textContent = error.message; }
});
document.querySelector('#forget').addEventListener('click', async () => { await chrome.storage.local.remove('pairing'); pairing = null; status.textContent = 'Connection forgotten.'; });
button.addEventListener('click', async () => {
  button.disabled = true;
  try {
    if (!pairing) throw new Error('Choose your local pairing.json file below first.');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) throw new Error('Open a regular website first. Browser settings and PDF viewer pages are not supported.');
    const [{ result: capture }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => {
      const selection = window.getSelection()?.toString()?.trim() || '';
      const raw = selection || document.body.innerText;
      const links = [...document.querySelectorAll('a[href]')]
        .filter(a => /\b(terms|conditions|privacy|agreement|legal|policy)\b/i.test(`${a.textContent} ${a.getAttribute('href')}`))
        .filter(a => /^https?:\/\//.test(a.href) && a.href.length <= 2048)
        .slice(0, 40).map(a => ({ label: a.textContent.trim().slice(0, 200), url: a.href }));
      return { url: location.href, title: document.title.slice(0, 300), text: raw.slice(0, 48000), links, captured_at: new Date().toISOString(), truncated: raw.length > 48000, selection: !!selection };
    } });
    const response = await fetch(`${pairing.endpoint}/capture`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${pairing.token}` }, body: JSON.stringify(capture), signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Capture failed (${response.status}). Check pairing and restart your MCP.`);
    status.textContent = `${capture.truncated ? 'Partial page captured. ' : 'Page captured. '}Ask your assistant: “Review my captured page, explain the important terms, what changed, and any red flags.”`;
  } catch (error) { status.textContent = error.message === 'Failed to fetch' ? 'Local MCP is not reachable. Start it in your assistant, then try again.' : error.message; }
  finally { button.disabled = false; }
});
