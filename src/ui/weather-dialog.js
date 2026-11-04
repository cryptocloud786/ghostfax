/**
 * src/ui/weather-dialog.js
 * Accessible city-search dialog for page 300 (Open-Meteo geocoding).
 * DOM-only.
 */

export function openCityDialog(searchCity, onPick) {
  let dlg = document.getElementById('city-dialog');
  if (!dlg) {
    dlg = document.createElement('dialog');
    dlg.id = 'city-dialog';
    dlg.setAttribute('aria-labelledby', 'city-dialog-title');
    dlg.innerHTML = `
      <form method="dialog" class="city-form">
        <h2 id="city-dialog-title">TUNE TO A CITY</h2>
        <label for="city-input">City name</label>
        <input id="city-input" name="city" autocomplete="off" required placeholder="e.g. Mumbai">
        <ul id="city-results" role="listbox" aria-label="Matching cities"></ul>
        <div class="city-actions">
          <button type="submit" value="search" id="city-search">SEARCH</button>
          <button type="button" id="city-cancel">CANCEL</button>
        </div>
      </form>`;
    document.body.appendChild(dlg);
    dlg.querySelector('#city-cancel').addEventListener('click', () => dlg.close());
  }

  const input = dlg.querySelector('#city-input');
  const list = dlg.querySelector('#city-results');
  list.innerHTML = '';

  dlg.querySelector('form').onsubmit = async (e) => {
    e.preventDefault();
    list.innerHTML = '<li class="muted">SEARCHING...</li>';
    let results = [];
    try { results = await searchCity(input.value.trim()); } catch { results = []; }
    list.innerHTML = '';
    if (!results || results.length === 0) {
      list.innerHTML = '<li class="muted">NO SIGNAL FOR THAT NAME</li>';
      return;
    }
    for (const r of results.slice(0, 6)) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'option');
      const label = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
      b.textContent = label.toUpperCase();
      b.addEventListener('click', () => {
        dlg.close();
        onPick({ name: label, lat: r.latitude ?? r.lat, lon: r.longitude ?? r.lon });
      });
      li.appendChild(b);
      list.appendChild(li);
    }
    list.querySelector('button')?.focus();
  };

  dlg.showModal();
  input.focus();
}
