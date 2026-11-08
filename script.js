const CATS = { Resistor: '#e0b84e', Capacitor: '#5fb4ff', Inductor: '#c08bff', Diode: '#ff8f6b', LED: '#ff5fa2', Transistor: '#6fe3a5', IC: '#e8e8e8', Microcontroller: '#4fe0d0', Sensor: '#b6e35a', Connector: '#ffb347', Other: '#93b0a7' };
const AB = { Resistor: 'R', Capacitor: 'C', Inductor: 'L', Diode: 'D', LED: 'LED', Transistor: 'Q', IC: 'IC', Microcontroller: 'µC', Sensor: 'SN', Connector: 'J', Other: '?' };
const KEY = 'partsbin.v1';
const $ = selector => document.querySelector(selector);
const uid = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 9);
const toNonNegative = value => Math.max(0, Number(value) || 0);
const seed = [
  ['10k resistor', 'Resistor', '10k', '0805', 200, 50, 'Drawer A1'], ['330Ω resistor', 'Resistor', '330', 'Through-hole', 80, 30, 'Drawer A2'],
  ['4.7k resistor', 'Resistor', '4.7k', 'Through-hole', 12, 20, 'Drawer A2'], ['100nF ceramic', 'Capacitor', '100nF', '0805', 150, 40, 'Drawer A3'],
  ['Red LED 5mm', 'LED', '2V', '5mm', 40, 15, 'Drawer B1'], ['2N2222', 'Transistor', 'NPN', 'TO-92', 25, 10, 'Drawer B2'],
  ['LM317', 'IC', '1.25–37V', 'TO-220', 3, 5, 'Drawer C1'], ['ESP32 DevKit', 'Microcontroller', '3.3V', 'Module', 4, 2, 'Box D']
].map(part => ({ id: uid(), name: part[0], cat: part[1], value: part[2], pkg: part[3], qty: part[4], min: part[5], loc: part[6], note: '', t: Date.now() }));

let S;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (_) { S = null; }
if (!Array.isArray(S)) S = seed;

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} };
let cat = 'All';
let lowOnly = false;
let undo = null;
let toastTimer;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const COL = ['#111', '#7a3e12', '#e03a2a', '#ff8a1f', '#f3d21c', '#2ea84a', '#2f6fe0', '#8b4fd0', '#888', '#f2f2f2'];

function bands(value) {
  const match = String(value).trim().replace(/[Ωω]|ohms?/gi, '').match(/^([\d.]+)\s*([kKmMrR]?)$/);
  if (!match) return null;
  let number = parseFloat(match[1]);
  if (!number) return null;
  number *= { k: 1e3, m: 1e6, r: 1 }[match[2].toLowerCase()] || 1;
  if (match[2] === 'm') number = parseFloat(match[1]) * 1e6;
  const exponent = Math.floor(Math.log10(number));
  const digits = Math.round(number / 10 ** (exponent - 1));
  const multiplier = exponent - 1;
  if (multiplier < -2 || multiplier > 9) return null;
  return [COL[Math.floor(digits / 10)], COL[digits % 10], multiplier >= 0 ? COL[multiplier] : (multiplier === -1 ? '#d6a93a' : '#c5c5c5')];
}

function art(part) {
  if (part.cat === 'Resistor') {
    const colors = bands(part.value);
    if (colors) return `<svg viewBox="0 0 80 28" width="68" aria-label="Resistor color bands"><path d="M0 14h14M66 14h14" stroke="#9aa" stroke-width="2"/><rect x="12" y="4" width="56" height="20" rx="9" fill="#d8c294"/>${colors.map((color, index) => `<rect x="${24 + index * 10}" y="4" width="5" height="20" fill="${color}"/>`).join('')}<rect x="57" y="4" width="4" height="20" fill="#d6a93a"/></svg>`;
  }
  return `<span class="ic" style="color:${CATS[part.cat] || CATS.Other}">${AB[part.cat] || '?'}</span>`;
}

function low(part) { return part.min > 0 && part.qty <= part.min; }

function render() {
  const query = $('#q').value.trim().toLowerCase();
  const sort = $('#sort').value;
  const list = S.filter(part => (cat === 'All' || part.cat === cat) && (!lowOnly || low(part)) && (!query || [part.name, part.value, part.pkg, part.loc, part.note, part.cat].join(' ').toLowerCase().includes(query)));
  list.sort((a, b) => sort === 'low' ? (a.qty / (a.min || 1)) - (b.qty / (b.min || 1)) : sort === 'new' ? b.t - a.t : sort === 'qty' ? b.qty - a.qty : a.name.localeCompare(b.name, undefined, { numeric: true }));
  $('#grid').innerHTML = list.length ? list.map(part => `<article class="card ${low(part) ? 'low' : ''}" data-id="${esc(part.id)}" tabindex="0" aria-label="Edit ${esc(part.name)}">
    <div class="art">${art(part)}</div>
    <div><h3>${esc(part.name)}</h3><div class="val">${esc([part.value, part.pkg].filter(Boolean).join(' · '))}</div><div class="meta">${esc(part.loc || 'No location')}${low(part) ? ' · reorder soon' : ''}</div></div>
    <div class="qty"><button data-a="dec" aria-label="Remove one ${esc(part.name)}">−</button><b>${part.qty}</b><button data-a="inc" aria-label="Add one ${esc(part.name)}">+</button></div>
    <div class="bar"><i style="width:${Math.min(100, part.min ? part.qty / (part.min * 2) * 100 : 100)}%"></i></div></article>`).join('') : `<div class="empty"><b>${S.length ? 'No parts match' : 'Your bin is empty'}</b>${S.length ? 'Try a different search or clear the filters.' : 'Tap “Add part” to log your first component.'}</div>`;
  const lows = S.filter(low).length;
  $('#sP').textContent = S.length;
  $('#sU').textContent = S.reduce((total, part) => total + part.qty, 0);
  $('#sL').textContent = lows;
  $('#sLw').classList.toggle('alert', lows > 0);
  const categories = ['All', ...Object.keys(CATS).filter(category => S.some(part => part.cat === category))];
  if (!categories.includes(cat)) cat = 'All';
  $('#chips').innerHTML = categories.map(category => `<button class="chip" aria-pressed="${category === cat}" data-c="${category}">${category}</button>`).join('') + `<button class="chip lowc" aria-pressed="${lowOnly}" data-low>Running low</button>`;
}

function toast(message, undoAction) {
  $('#tm').textContent = message;
  $('#tu').hidden = !undoAction;
  undo = undoAction || null;
  $('#toast').classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('on'), 4500);
}

$('#tu').onclick = () => { if (undo) undo(); undo = null; $('#toast').classList.remove('on'); };
$('#chips').onclick = event => {
  const button = event.target.closest('.chip');
  if (!button) return;
  if ('low' in button.dataset) lowOnly = !lowOnly;
  else cat = button.dataset.c;
  render();
};
$('#q').oninput = render;
$('#sort').onchange = render;
$('#grid').onclick = event => {
  const card = event.target.closest('.card');
  if (!card) return;
  const part = S.find(item => item.id === card.dataset.id);
  const action = event.target.closest('[data-a]');
  if (!action) return openEdit(part);
  event.stopPropagation();
  part.qty = Math.max(0, part.qty + (action.dataset.a === 'inc' ? 1 : -1));
  part.t = Date.now();
  save();
  render();
  if (action.dataset.a === 'dec' && part.qty === part.min) toast(`${part.name} is at its alert level`);
};
$('#grid').onkeydown = event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.classList.contains('card')) {
    event.preventDefault();
    openEdit(S.find(part => part.id === event.target.dataset.id));
  }
};

const form = $('#f');
const dialog = $('#dlg');
const fields = form.elements;
let editing = null;
fields.cat.innerHTML = Object.keys(CATS).map(category => `<option>${category}</option>`).join('');

function openEdit(part) {
  editing = part;
  $('#ft').textContent = part ? 'Edit part' : 'Add part';
  $('#del').hidden = !part;
  form.reset();
  if (part) for (const key of ['name', 'cat', 'value', 'pkg', 'loc', 'qty', 'min', 'note']) fields[key].value = part[key] ?? '';
  dialog.showModal();
  fields.name.focus();
}

$('#add').onclick = () => openEdit(null);
$('#cx').onclick = () => dialog.close();
dialog.onclick = event => { if (event.target === dialog) dialog.close(); };
form.onsubmit = event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  data.name = data.name.trim();
  data.qty = toNonNegative(data.qty);
  data.min = toNonNegative(data.min);
  data.t = Date.now();
  if (editing) Object.assign(editing, data);
  else S.push({ id: uid(), ...data });
  save();
  render();
  dialog.close();
  toast(editing ? 'Saved changes' : `Added ${data.name}`);
};
$('#del').onclick = () => {
  const part = editing;
  const index = S.indexOf(part);
  S.splice(index, 1);
  save();
  render();
  dialog.close();
  toast(`Deleted ${part.name}`, () => { S.splice(index, 0, part); save(); render(); });
};
$('#exp').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `partsbin-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
$('#imp').onclick = () => $('#file').click();
$('#file').onchange = async event => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    if (!Array.isArray(data)) throw new Error('Backup must be an array');
    S = data.map(part => ({ id: part.id || uid(), name: String(part.name || 'Unnamed'), cat: CATS[part.cat] ? part.cat : 'Other', value: String(part.value || ''), pkg: String(part.pkg || ''), qty: toNonNegative(part.qty), min: toNonNegative(part.min), loc: String(part.loc || ''), note: String(part.note || ''), t: Number(part.t) || Date.now() }));
    save();
    render();
    toast(`Imported ${S.length} parts`);
  } catch (_) { toast('That file is not a Partsbin backup'); }
  event.target.value = '';
};
addEventListener('keydown', event => {
  if (dialog.open || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  if (event.key === '/') { event.preventDefault(); $('#q').focus(); }
  else if (event.key.toLowerCase() === 'n') openEdit(null);
});
render();
