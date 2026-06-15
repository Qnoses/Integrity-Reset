const $ = (id) => document.getElementById(id);

function send(cmd) {
  return chrome.runtime.sendMessage({ cmd });
}

async function refresh() {
  let n = 0;
  try { const r = await send('getState'); n = (r && r.disabledCount) || 0; } catch (e) {}
  const s = $('status');
  if (n > 0) {
    s.textContent = n + ' extension' + (n === 1 ? '' : 's') + ' disabled by this tool';
    s.className = 'off';
  } else {
    s.textContent = 'All extensions enabled';
    s.className = 'ok';
  }
}

function wire(id, cmd, closeAfter) {
  $(id).addEventListener('click', async () => {
    try { await send(cmd); } catch (e) {}
    if (closeAfter) window.close(); else refresh();
  });
}

wire('reset', 'reset', true);       // tab reloads; popup closes
wire('disable', 'disable', false);  // stays open so you see the count change
wire('clear', 'clear', true);       // tab reloads; popup closes
wire('reenable', 'reenable', false);

refresh();
