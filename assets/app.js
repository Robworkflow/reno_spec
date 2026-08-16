/* ================================================
   Daniko Reno Spec Sheet — Main Application Logic
   Plain vanilla JS, no build step required.
   ================================================ */

// ── STATE ──────────────────────────────────────
let SPEC = null;       // loaded from data/spec-content.json
let record = null;     // current record object
let saveTimer = null;  // debounce handle

// ── INIT ───────────────────────────────────────
async function init() {
  SPEC = await fetch('data/spec-content.json').then(r => r.json());

  const params = new URLSearchParams(location.search);
  const recordId = params.get('record');

  if (recordId) {
    await loadRecord(recordId);
  } else {
    createBlankRecord();
  }

  wireIntakeFields();
}

// ── SCREENS ────────────────────────────────────
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(`screen-${name}`);
  if (el) el.classList.add('active');
}

// ── RECORD AUTO-CREATE ─────────────────────────
function createBlankRecord() {
  const id = slugify(`draft-${randSuffix()}`);
  record = {
    id,
    address: '',
    unit: '',
    walkthrough_date: '',
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    formData: {
      unit_type: '',
      quote_from: 'management@daniko.ca',
      deadline: '',
    },
    sections: buildBlankSections(),
    notes: {
      start_date: '',
      finish_date: '',
      cost_materials: '',
      cost_labour: '',
      cost_hst: '',
      cost_total: '',
      payment_1: '',
      payment_2: '',
      payment_3: '',
      wall_removal: '',
      contractor_notes: '',
      sig_name: '',
      sig_date: '',
    }
  };
  localSave(record);
  history.replaceState(null, '', `?record=${id}`);
  renderApp();
}

// ── INTAKE FIELD WIRING ────────────────────────
function wireIntakeFields() {
  const fields = [
    { id: 'field-address',          set: v => { if (record) record.address = v; } },
    { id: 'field-unit',             set: v => { if (record) record.unit = v; } },
    { id: 'field-walkthrough-date', set: v => { if (record) record.walkthrough_date = v; } },
    { id: 'field-unit-type',        set: v => { if (record) record.formData.unit_type = v; } },
    { id: 'field-deadline',         set: v => { if (record) record.formData.deadline = v; } },
  ];
  fields.forEach(({ id, set }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input',  () => { set(el.value); scheduleSave(); });
    el.addEventListener('change', () => { set(el.value); scheduleSave(); });
  });
}

function buildBlankSections() {
  const out = {};
  SPEC.sections.forEach(sec => {
    if (sec.type === 'spec') {
      out[sec.id] = {};
      sec.items.forEach(item => {
        out[sec.id][item.id] = {
          checked: false,
          choice: null,
          qty: '1',
          equiv: '',
          notes: '',
          photos: [],
        };
      });
    }
  });
  return out;
}

// ── LOAD RECORD ────────────────────────────────
async function loadRecord(id) {
  showScreen('loading');
  try {
    const loaded = await remoteLoad(id);
    if (!loaded) {
      toast('Record not found. Starting new record.', 'error');
      setTimeout(() => createBlankRecord(), 1500);
      return;
    }
    record = loaded;
    renderApp();
  } catch(err) {
    toast('Could not load record. Using local data.', 'error');
    const local = localLoad(id);
    if (local) {
      record = local;
      renderApp();
    } else {
      createBlankRecord();
    }
  }
}

// ── RENDER APP ─────────────────────────────────
function renderApp() {
  renderHeader();
  renderProgress();
  renderSections();
  renderNotesSection();
  renderSendArea();
  showScreen('record');
}

// ── HEADER ─────────────────────────────────────
function renderHeader() {
  // Populate editable property fields (skip if field has focus — user may be typing)
  const fieldValues = [
    ['field-address',          record.address || ''],
    ['field-unit',             record.unit || ''],
    ['field-walkthrough-date', record.walkthrough_date || ''],
    ['field-unit-type',        record.formData?.unit_type || ''],
    ['field-deadline',         record.formData?.deadline || ''],
  ];
  fieldValues.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = val;
  });

  const idLabel = document.getElementById('record-id-label');
  if (idLabel) idLabel.textContent = `ID: ${record.id}`;

  const pill = document.getElementById('status-pill');
  pill.className = `status-pill ${record.status}`;
  pill.textContent = record.status.toUpperCase();

  const autosave = document.getElementById('autosave-indicator');
  autosave.textContent = '';
}

// ── PROGRESS ───────────────────────────────────
function renderProgress() {
  const { total, done } = countProgress();
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  document.getElementById('progress-label').textContent = `Items marked: ${done} / ${total}`;
  const fill = document.getElementById('progress-fill');
  fill.style.width = `${pct}%`;
  fill.className = 'progress-bar-fill' + (pct === 100 ? ' complete' : '');
  document.getElementById('progress-pct').textContent = `${pct}%`;
}

function countProgress() {
  let total = 0, done = 0;
  SPEC.sections.forEach(sec => {
    if (sec.type !== 'spec') return;
    sec.items.forEach(item => {
      total++;
      const s = getSectionItemState(sec.id, item.id);
      if (item.inputType === 'checkbox' && s.checked) done++;
      if (item.inputType === 'choice' && s.choice !== null) done++;
    });
  });
  return { total, done };
}

function getSectionItemState(secId, itemId) {
  return record.sections[secId]?.[itemId] || { checked: false, choice: null, qty: '1', equiv: '', notes: '', photos: [] };
}

// ── SECTIONS ───────────────────────────────────
function renderSections() {
  const container = document.getElementById('sections-container');
  container.innerHTML = '';

  SPEC.sections.forEach(sec => {
    if (sec.type === 'spec')     container.appendChild(renderSpecSection(sec));
    if (sec.type === 'supplies') container.appendChild(renderSuppliesSection(sec));
    if (sec.type === 'schedule') container.appendChild(renderScheduleSection(sec));
  });
}

// ── SPEC SECTION ───────────────────────────────
function renderSpecSection(sec) {
  const el = document.createElement('div');
  el.className = 'accordion-section';
  el.dataset.secId = sec.id;

  const { secDone, secTotal } = sectionProgress(sec);
  const dotClass = secDone === 0 ? '' : secDone === secTotal ? ' complete' : ' partial';

  el.innerHTML = `
    <button class="accordion-header" aria-expanded="false">
      <span class="section-dot${dotClass}"></span>
      <span class="section-title">${sec.title}</span>
      <span class="section-count">${secDone}/${secTotal}</span>
      <span class="section-chevron">▾</span>
    </button>
    <div class="accordion-body">
      ${sec.note ? `<div class="section-note">${sec.note}</div>` : ''}
      <div class="items-list"></div>
    </div>
  `;

  el.querySelector('.accordion-header').addEventListener('click', () => {
    el.classList.toggle('open');
    el.querySelector('.accordion-header').setAttribute(
      'aria-expanded', el.classList.contains('open')
    );
  });

  const list = el.querySelector('.items-list');
  sec.items.forEach(item => list.appendChild(renderItem(sec, item)));

  return el;
}

function sectionProgress(sec) {
  let secTotal = 0, secDone = 0;
  sec.items.forEach(item => {
    secTotal++;
    const s = getSectionItemState(sec.id, item.id);
    if (item.inputType === 'checkbox' && s.checked) secDone++;
    if (item.inputType === 'choice' && s.choice !== null) secDone++;
  });
  return { secDone, secTotal };
}

// ── ITEM RENDERING ─────────────────────────────
function renderItem(sec, item) {
  const state = getSectionItemState(sec.id, item.id);
  const isEditable = canEdit();

  const el = document.createElement('div');
  el.className = 'spec-item' + (state.checked ? ' checked' : '');
  el.dataset.secId = sec.id;
  el.dataset.itemId = item.id;

  const specText = item.spec?.brand
    ? `<strong>${item.spec.brand}</strong>${item.spec.sub ? ' — ' + item.spec.sub : ''}`
    : (item.spec?.sub || '');

  let inputHtml = '';
  if (item.inputType === 'checkbox') {
    const chk = state.checked ? ' checked' : '';
    inputHtml = `<div class="item-checkbox${chk}" role="checkbox" aria-checked="${!!state.checked}" tabindex="0"></div>`;
  } else if (item.inputType === 'choice') {
    const choices = item.choices || ['Yes — Replace / Install', 'No — Existing satisfactory'];
    const btns = choices.map((c, i) => {
      const sel = state.choice === i ? (i === 0 ? ' selected-yes' : ' selected-no') : '';
      return `<button class="choice-btn${sel}" data-choice-idx="${i}">${c}</button>`;
    }).join('');
    inputHtml = `<div class="item-choice-btns">${btns}</div>`;
  }

  // Every item now carries at least a Notes field, so every card gets the
  // expand/collapse toggle (not just items with Qty/Photo/Equivalent).
  const hasDetails = true;

  el.innerHTML = `
    <div class="item-main">
      ${item.inputType === 'checkbox' ? inputHtml : ''}
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        ${specText ? `<div class="item-spec">${specText}</div>` : ''}
        ${item.inputType === 'choice' ? inputHtml : ''}
      </div>
      ${hasDetails ? `<button class="item-expand-btn" aria-label="Show details" aria-expanded="false"><span class="item-chevron">▾</span></button>` : ''}
    </div>
    ${hasDetails ? `<div class="item-detail">${renderItemDetail(item, state, isEditable)}</div>` : ''}
  `;

  // Checkbox toggle
  if (item.inputType === 'checkbox') {
    const chkEl = el.querySelector('.item-checkbox');
    if (isEditable) {
      chkEl.addEventListener('click', () => toggleCheckbox(sec.id, item.id, el));
      chkEl.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') toggleCheckbox(sec.id, item.id, el); });
    }
  }

  // Choice buttons
  if (item.inputType === 'choice') {
    el.querySelectorAll('.choice-btn').forEach(btn => {
      if (isEditable) {
        btn.addEventListener('click', () => setChoice(sec.id, item.id, parseInt(btn.dataset.choiceIdx), el));
      }
    });
  }

  // Expand toggle
  if (hasDetails) {
    const expandBtn = el.querySelector('.item-expand-btn');
    expandBtn.addEventListener('click', () => {
      const nowExpanded = el.classList.toggle('expanded');
      expandBtn.setAttribute('aria-expanded', String(nowExpanded));
      expandBtn.setAttribute('aria-label', nowExpanded ? 'Hide details' : 'Show details');
    });
  }

  // Wire detail inputs
  wireDetailInputs(el, sec.id, item, state, isEditable);

  return el;
}

function renderItemDetail(item, state, isEditable) {
  let html = '';
  if (item.hasQty) {
    const qtyVal = (state.qty !== '' && state.qty != null) ? state.qty : '1';
    html += `
      <div class="detail-row">
        <span class="detail-label">Qty</span>
        <input class="detail-input detail-input-qty" type="text" name="qty" placeholder="1" value="${esc(qtyVal)}" ${isEditable ? '' : 'disabled'}>
      </div>`;
  }
  if (item.hasEquiv) {
    html += `
      <div class="detail-row">
        <span class="detail-label">Equivalent</span>
        <input class="detail-input" type="text" name="equiv" placeholder="Approved equivalent (if any)" value="${esc(state.equiv)}" ${isEditable ? '' : 'disabled'}>
      </div>`;
  }
  html += `
    <div class="detail-row">
      <span class="detail-label">Notes</span>
      <textarea class="detail-input detail-textarea" name="notes" rows="2" placeholder="Optional notes" ${isEditable ? '' : 'disabled'}>${esc(state.notes)}</textarea>
    </div>`;
  if (item.hasPhoto) {
    const thumbs = (state.photos || []).map(url =>
      `<img class="photo-thumb" src="${esc(url)}" alt="Photo">`
    ).join('');
    html += `
      <div class="detail-row">
        <span class="detail-label">Photos</span>
        <div class="photo-row">
          ${thumbs}
          ${isEditable ? `
            <button class="photo-upload-btn photo-camera-btn" type="button">📷 Take Photo<input type="file" class="hidden-file-input" accept="image/*" capture="environment"></button>
            <button class="photo-upload-btn photo-library-btn" type="button">🖼️ Upload Photo<input type="file" class="hidden-file-input" accept="image/*"></button>
          ` : ''}
        </div>
      </div>`;
  }
  return html;
}

function wireDetailInputs(el, secId, item, state, isEditable) {
  if (!isEditable) return;

  const qtyInput = el.querySelector('input[name="qty"]');
  if (qtyInput) {
    qtyInput.addEventListener('input', () => {
      record.sections[secId][item.id].qty = qtyInput.value;
      scheduleSave();
    });
  }

  const equivInput = el.querySelector('input[name="equiv"]');
  if (equivInput) {
    equivInput.addEventListener('input', () => {
      record.sections[secId][item.id].equiv = equivInput.value;
      scheduleSave();
    });
  }

  const notesInput = el.querySelector('textarea[name="notes"]');
  if (notesInput) {
    notesInput.addEventListener('input', () => {
      record.sections[secId][item.id].notes = notesInput.value;
      scheduleSave();
    });
  }

  el.querySelectorAll('.photo-upload-btn').forEach(photoBtn => {
    const fileInput = photoBtn.querySelector('input[type="file"]');
    photoBtn.addEventListener('click', e => {
      if (e.target !== fileInput) fileInput.click();
    });
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (file) uploadPhoto(file, secId, item.id, el);
      fileInput.value = '';
    });
  });
}

// ── CHECKBOX / CHOICE ─────────────────────────
function toggleCheckbox(secId, itemId, el) {
  const s = record.sections[secId][itemId];
  s.checked = !s.checked;
  el.classList.toggle('checked', s.checked);
  const chk = el.querySelector('.item-checkbox');
  chk.classList.toggle('checked', s.checked);
  chk.setAttribute('aria-checked', String(s.checked));
  updateSectionDot(secId);
  renderProgress();
  scheduleSave();
}

function setChoice(secId, itemId, idx, el) {
  const s = record.sections[secId][itemId];
  s.choice = (s.choice === idx) ? null : idx;
  el.querySelectorAll('.choice-btn').forEach((btn, i) => {
    btn.className = 'choice-btn';
    if (s.choice === i) btn.classList.add(i === 0 ? 'selected-yes' : 'selected-no');
  });
  updateSectionDot(secId);
  renderProgress();
  scheduleSave();
}

function updateSectionDot(secId) {
  const sec = SPEC.sections.find(s => s.id === secId);
  if (!sec) return;
  const el = document.querySelector(`.accordion-section[data-sec-id="${secId}"]`);
  if (!el) return;
  const { secDone, secTotal } = sectionProgress(sec);
  const dot = el.querySelector('.section-dot');
  dot.className = 'section-dot' + (secDone === 0 ? '' : secDone === secTotal ? ' complete' : ' partial');
  el.querySelector('.section-count').textContent = `${secDone}/${secTotal}`;
}

// ── SUPPLIES SECTION ───────────────────────────
function renderSuppliesSection(sec) {
  const el = document.createElement('div');
  el.className = 'supplies-section';
  el.innerHTML = `<div class="supplies-title">${sec.title}</div>` +
    sec.items.map(i => `
      <div class="supply-item">
        <div class="supply-name">${i.name}</div>
        <div class="supply-detail">${i.detail}</div>
      </div>`).join('');
  return el;
}

// ── SCHEDULE A SECTION ─────────────────────────
function renderScheduleSection(sec) {
  const el = document.createElement('div');
  el.className = 'schedule-section';
  el.innerHTML = `<div class="schedule-title">${sec.title}</div>` +
    sec.items.map(i => `
      <div class="schedule-item">
        <div class="schedule-item-name">${i.name}</div>
        <div class="schedule-item-detail">${i.detail}</div>
      </div>`).join('') +
    (sec.passFail ? `<div class="pass-fail-note">${sec.passFail}</div>` : '');
  return el;
}

// ── NOTES SECTION ──────────────────────────────
function renderNotesSection() {
  const container = document.getElementById('notes-container');
  const editable = canEdit();
  const isPriced  = record.status === 'priced'  || record.status === 'signed';
  const isSigned  = record.status === 'signed';
  const n = record.notes;

  const costReadonly = !isPriced ? 'disabled' : '';
  const notesReadonly = !editable ? 'disabled' : '';

  container.innerHTML = `
    <div class="notes-section">
      <div class="notes-title">CONTRACTOR NOTES &amp; SCOPE CLARIFICATIONS</div>
      <div class="notes-grid">

        <div class="notes-row">
          <div class="notes-field">
            <label>Start Date</label>
            <input type="date" name="start_date" value="${esc(n.start_date)}" ${notesReadonly}>
          </div>
          <div class="notes-field">
            <label>Finish Date</label>
            <input type="date" name="finish_date" value="${esc(n.finish_date)}" ${notesReadonly}>
          </div>
        </div>

        <div class="notes-field">
          <label>Total Quoted Cost</label>
          <div class="cost-table">
            <div class="cost-row">
              <span class="cost-label">Materials $</span>
              <input class="cost-input" type="text" name="cost_materials" value="${esc(n.cost_materials)}" placeholder="0.00" ${costReadonly}>
            </div>
            <div class="cost-row">
              <span class="cost-label">Labour $</span>
              <input class="cost-input" type="text" name="cost_labour" value="${esc(n.cost_labour)}" placeholder="0.00" ${costReadonly}>
            </div>
            <div class="cost-row">
              <span class="cost-label">HST $</span>
              <input class="cost-input" type="text" name="cost_hst" value="${esc(n.cost_hst)}" placeholder="0.00" ${costReadonly}>
            </div>
            <div class="cost-row total-row">
              <span class="cost-label" style="font-weight:800;">TOTAL $</span>
              <input class="cost-input" type="text" name="cost_total" value="${esc(n.cost_total)}" placeholder="0.00" ${costReadonly} style="font-weight:800;">
            </div>
          </div>
          ${!isPriced ? '<div class="form-hint">Cost fields are filled in by Daniko after pricing is received.</div>' : ''}
        </div>

        <div class="notes-field">
          <label>Payment Schedule</label>
          <div class="payment-table">
            <div class="payment-row">
              <span class="payment-label">On contract signing</span>
              <span class="payment-pct">20%</span>
              <input class="payment-input" type="text" name="payment_1" value="${esc(n.payment_1)}" placeholder="$" ${costReadonly}>
            </div>
            <div class="payment-row">
              <span class="payment-label">On completion &amp; Daniko approval</span>
              <span class="payment-pct">60%</span>
              <input class="payment-input" type="text" name="payment_2" value="${esc(n.payment_2)}" placeholder="$" ${costReadonly}>
            </div>
            <div class="payment-row">
              <span class="payment-label">On final walk-through</span>
              <span class="payment-pct">20%</span>
              <input class="payment-input" type="text" name="payment_3" value="${esc(n.payment_3)}" placeholder="$" ${costReadonly}>
            </div>
          </div>
          <div class="info-box mt-2">Progress payment photo submission is mandatory. Payment will not be released without Daniko approval of submitted photos.</div>
        </div>

        <div class="notes-field">
          <label>Jobsite Cleanliness</label>
          <div class="info-box">The unit must be left in move-in ready condition upon completion. This is a hard requirement, not a suggestion. ⚠ If the unit is not left in acceptable condition, Daniko reserves the right to deduct professional cleaning costs from the final payment.</div>
        </div>

        <div class="notes-field">
          <label>Wall Removal / Relocation</label>
          <textarea name="wall_removal" rows="3" placeholder="Note any wall removal/relocation scope for this unit — location, wall type (load-bearing vs. partition), and any engineering/permit requirements." ${notesReadonly}>${esc(n.wall_removal)}</textarea>
        </div>

        <div class="notes-field">
          <label>Contractor Notes</label>
          <textarea name="contractor_notes" rows="4" placeholder="General notes, site conditions, flags for Daniko..." ${notesReadonly}>${esc(n.contractor_notes)}</textarea>
        </div>

        <div class="notes-field">
          <label>Substitutions</label>
          <div class="info-box">Any substitution to the Daniko Standard Spec must be approved in writing before ordering. Use the Approved Equivalent column and flag to Daniko project lead.</div>
        </div>

        <div class="notes-field">
          <label>Quote Format</label>
          <div class="info-box">Quote must separate labour and material costs per section. Lump sum quotes will not be accepted.</div>
        </div>

        <div class="notes-field">
          <label>Site Conditions</label>
          <div class="info-box">Contractor responsible for pre-walkthrough. Any scope additions due to unforeseen conditions must be flagged and approved before work proceeds.</div>
        </div>

        <div class="notes-field">
          <label>Demo &amp; Haul-Away</label>
          <div class="info-box">Removal and disposal of all existing materials being replaced is included in the contractor's scope and quoted price. Site must be left clear of demo debris daily — no accumulation left on-site overnight.</div>
        </div>

        ${isSigned ? `
        <div class="notes-field">
          <label>Warranty — 2-Year Coverage</label>
          <div class="info-box mb-2">By accepting this contract, the contractor agrees to provide a full two-year warranty covering both parts and labour on all work completed under this scope. Any defects in workmanship or materials that appear within 24 months of the confirmed completion date will be repaired or replaced by the contractor at no cost to Daniko Management Ltd. This warranty does not cover damage caused by tenant misuse, normal wear and tear, or modifications made by a third party after handover.</div>
          <div class="signature-block">
            <div class="sig-row">
              <div class="sig-field">
                <label>Contractor Name</label>
                <input type="text" name="sig_name" value="${esc(n.sig_name)}" placeholder="Full name" ${isSigned && record.status === 'signed' ? '' : 'disabled'}>
              </div>
              <div class="sig-field">
                <label>Date Signed</label>
                <input type="date" name="sig_date" value="${esc(n.sig_date)}" ${isSigned && record.status === 'signed' ? '' : 'disabled'}>
              </div>
            </div>
          </div>
        </div>` : ''}

      </div>
    </div>
  `;

  if (editable || isPriced) {
    container.querySelectorAll('input, textarea').forEach(inp => {
      inp.addEventListener('input', () => {
        record.notes[inp.name] = inp.value;
        scheduleSave();
      });
    });
  }
}

// ── SEND AREA ──────────────────────────────────
function renderSendArea() {
  const area = document.getElementById('send-area');
  const { total, done } = countProgress();
  const allDone = done === total;
  const status = record.status;

  let actionBtnHtml = '';
  let hintHtml = '';

  if (status === 'draft') {
    actionBtnHtml = `
      <button class="btn btn-primary" id="btn-send" ${allDone ? '' : 'disabled'}>
        Send for Pricing
      </button>`;
    hintHtml = `<div class="send-hint">${allDone ? 'All items marked — ready to send.' : `${total - done} item(s) still need to be marked before sending.`}</div>`;
  } else if (status === 'sent') {
    actionBtnHtml = `<button class="btn btn-primary" id="btn-mark-priced">Mark as Priced</button>`;
    hintHtml = `<div class="send-hint">Waiting for contractor pricing. Mark as priced once cost fields are filled in.</div>`;
  } else if (status === 'priced') {
    actionBtnHtml = `<button class="btn btn-success" id="btn-mark-signed">Mark as Signed</button>`;
    hintHtml = `<div class="send-hint">Review cost and payment details, then mark as signed to finalize.</div>`;
  } else if (status === 'signed') {
    hintHtml = `<div class="send-hint" style="text-align:center;color:var(--success);font-weight:700;">✓ Contract signed. This record is now read-only.</div>`;
  }

  const html = `
    <div class="send-btn-row">
      ${actionBtnHtml}
      <button class="btn btn-ghost" id="btn-preview-pdf" type="button">Preview PDF</button>
    </div>
    ${hintHtml}
  `;

  area.innerHTML = html;

  document.getElementById('btn-send')?.addEventListener('click', sendForPricing);
  document.getElementById('btn-mark-priced')?.addEventListener('click', markPriced);
  document.getElementById('btn-mark-signed')?.addEventListener('click', markSigned);
  document.getElementById('btn-preview-pdf')?.addEventListener('click', previewPdf);
}

// ── PDF PREVIEW ─────────────────────────────────
// Print CSS (see styles.css @media print) force-expands every accordion
// section and item card, hides interactive chrome, and paginates for
// Letter-size output — so the browser's Print → Save as PDF dialog
// produces a full, readable record regardless of on-screen collapsed state.
function previewPdf() {
  window.print();
}

// ── STATUS TRANSITIONS ─────────────────────────
async function sendForPricing() {
  const { total, done } = countProgress();
  if (done < total) return toast(`${total - done} items still need to be marked.`, 'error');

  record.status = 'sent';
  record.updatedAt = new Date().toISOString();
  await saveRecord();

  if (WEBHOOKS.SEND_FOR_PRICING) {
    try {
      await fetch(WEBHOOKS.SEND_FOR_PRICING, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (e) { /* n8n will retry */ }
  }

  toast('Sent for pricing!', 'ok');
  renderApp();
}

async function markPriced() {
  record.status = 'priced';
  record.updatedAt = new Date().toISOString();
  await saveRecord();
  toast('Marked as priced.', 'ok');
  renderApp();
}

async function markSigned() {
  record.status = 'signed';
  record.updatedAt = new Date().toISOString();
  await saveRecord();

  if (WEBHOOKS.MARK_SIGNED) {
    try {
      await fetch(WEBHOOKS.MARK_SIGNED, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch (e) { /* n8n will handle */ }
  }

  toast('Contract signed!', 'ok');
  renderApp();
}

// ── EDITABILITY ────────────────────────────────
function canEdit() {
  return record.status === 'draft' || record.status === 'priced';
}

// ── AUTO-SAVE ──────────────────────────────────
function scheduleSave() {
  clearTimeout(saveTimer);
  setAutosaveState('saving');
  saveTimer = setTimeout(async () => {
    await saveRecord();
    setAutosaveState('saved');
    setTimeout(() => setAutosaveState(''), 2000);
  }, 2000);
}

function setAutosaveState(state) {
  const el = document.getElementById('autosave-indicator');
  el.className = `autosave-indicator ${state}`;
  el.textContent = state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved ✓' : '';
}

// ── PERSISTENCE ────────────────────────────────
async function saveRecord() {
  record.updatedAt = new Date().toISOString();

  if (WEBHOOKS.SAVE_RECORD) {
    try {
      const res = await fetch(WEBHOOKS.SAVE_RECORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (!res.ok) throw new Error('save failed');
      localSave(record);
      return;
    } catch (e) {
      // fall through to localStorage
    }
  }

  localSave(record);
}

async function remoteLoad(id) {
  if (WEBHOOKS.LOAD_RECORD) {
    try {
      const res = await fetch(WEBHOOKS.LOAD_RECORD, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.ok) return await res.json();
    } catch (e) { /* fall through */ }
  }
  return localLoad(id);
}

function localSave(rec) {
  try {
    localStorage.setItem(`daniko_record_${rec.id}`, JSON.stringify(rec));
  } catch (e) { /* storage full */ }
}

function localLoad(id) {
  try {
    const raw = localStorage.getItem(`daniko_record_${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

// ── PHOTO UPLOAD ───────────────────────────────
async function uploadPhoto(file, secId, itemId, el) {
  if (!record.sections[secId]?.[itemId]) return;

  if (WEBHOOKS.UPLOAD_PHOTO) {
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('itemId', itemId);
      form.append('recordId', record.id);

      const res = await fetch(WEBHOOKS.UPLOAD_PHOTO, { method: 'POST', body: form });
      if (res.ok) {
        const { url } = await res.json();
        record.sections[secId][itemId].photos.push(url);
        scheduleSave();
        addPhotoThumb(el, url);
        return;
      }
    } catch (e) { /* fall through */ }
  }

  // Local preview fallback (no server)
  const url = URL.createObjectURL(file);
  record.sections[secId][itemId].photos.push(url);
  scheduleSave();
  addPhotoThumb(el, url);
}

function addPhotoThumb(el, url) {
  const row = el.querySelector('.photo-row');
  if (!row) return;
  const img = document.createElement('img');
  img.className = 'photo-thumb';
  img.src = url;
  img.alt = 'Photo';
  const btn = row.querySelector('.photo-upload-btn');
  row.insertBefore(img, btn);
}

// ── TOAST ──────────────────────────────────────
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `${type ? type : ''}`;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ── UTILITIES ──────────────────────────────────
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugify(str) {
  return str.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function randSuffix() {
  return Math.random().toString(36).slice(2, 7);
}

// ── START ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
