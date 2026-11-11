// Shared UI helpers: tokens, cards, toasts, modals.
import { CARDS, SIGS, POS_NAMES } from '../data/cards.js';
import { TRAITS } from '../data/traits.js';
import { gearInfo } from '../data/gear.js';
import { PERKS, CLASS_NAMES } from '../data/content.js';
import { helmet, stars, esc } from './art.js';

export function tokenHTML(unit, colors, opts = {}) {
  if (!unit) return '';
  const card = CARDS[unit.card];
  const items = (unit.items || []).map((g) => `<span title="${esc(gearInfo(g)?.name)}">${gearInfo(g)?.icon || '?'}</span>`).join('');
  const cls = unit.cls ?? 0;
  return `<div class="token t${card.tier} ${opts.sel ? 'sel' : ''} ${opts.small ? 'small' : ''}">
${helmet(colors, { flip: opts.flip, num: unit.num || card.num })}
${stars(unit.star)}
${opts.noTags ? '' : `<span class="pos-tag">${card.pos}</span><span class="cls-tag ${cls >= 3 ? 'sr' : ''}">${CLASS_NAMES[cls]}</span>`}
${unit.perk && PERKS[unit.perk] ? `<span class="perk" title="${esc(PERKS[unit.perk].name)}">${PERKS[unit.perk].icon}</span>` : ''}
${items ? `<div class="gear">${items}</div>` : ''}
</div>`;
}

export function walkonHTML(colors, flip) {
  return `<div class="token walk">${helmet(colors, { flip, walkon: true })}</div>`;
}

export function shortName(unit) {
  const name = unit.name || CARDS[unit.card].name;
  const clean = name.replace(/".*?"\s*/, '');
  const parts = clean.split(' ');
  return parts.length > 1 ? `${parts[0][0]}. ${parts.slice(1).join(' ')}` : clean;
}

export function cardHTML(cardId, colors, extra = {}) {
  if (!cardId) return `<div class="card empty">Sold</div>`;
  const c = CARDS[cardId];
  const traits = c.traits.map((t) => `<span>${TRAITS[t].icon} ${esc(TRAITS[t].name)}</span>`).join('');
  return `<button class="card t${c.tier} ${extra.cant ? 'cant' : ''} ${extra.owned ? 'owned' : ''}" ${extra.owned ? `data-owned="${extra.owned}"` : ''} data-act="${extra.act || 'shop'}" data-idx="${extra.idx ?? ''}" title="${esc(c.name)} · ${esc(POS_NAMES[c.pos])} · ${esc(SIGS[c.sig].name)}: ${esc(SIGS[c.sig].desc)}">
<div class="c-top">${helmet(colors, { num: c.num })}<span class="c-pos">${c.pos}</span></div>
<div class="c-name">${esc(c.name)}</div>
<div class="c-traits">${traits}</div>
<div class="c-sig">${esc(SIGS[c.sig].name)}</div>
<span class="c-cost">$${c.cost}</span>
</button>`;
}

let toastTimer = 0;
export function toast(msg, kind = '') {
  if (!msg) return;
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = msg;
  root.appendChild(el);
  while (root.children.length > 3) root.removeChild(root.firstChild);
  clearTimeout(toastTimer);
  setTimeout(() => el.remove(), 2600);
}

let modalStack = 0;
export function isModalOpen() { return modalStack > 0; }

// Shows a modal. bind(el, close) wires up events. Returns close().
export function showModal(html, bind, { wide = false, dismissable = false } = {}) {
  const root = document.getElementById('modal-root');
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${wide ? 'wide' : ''}" role="dialog">${html}</div>`;
  root.appendChild(bg);
  modalStack++;
  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    modalStack--;
    bg.remove();
  };
  if (dismissable) bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  bind?.(bg.querySelector('.modal'), close);
  return close;
}
