// app.js — Byggbiten Renoveringskalkyl
// Fas C: interaktion (add/remove rum, checkbox-togglar, radio-grupp, schablon-grey, inputs).

(function () {
  'use strict';

  // Statiska helpers + konstanter — populerade direkt vid script-load.
  const {
    PUZZLE_SVG,
    DEFAULT_CEILING_HEIGHT,
    calcItemTotal,
    calcRoomSubtotal,
    calcTotal,
    calcWallArea,
    formatKr,
    demoState,
    emptyState
  } = window.APP_DATA;

  // Dynamiska värden — populerade av loadConfig() i bootstrap (se slutet av filen).
  // Deklarerade som `let` i yttre IIFE-scope så alla funktioner läser uppdaterade värden.
  let ROOM_TYPES = null;
  let ROOM_TYPE_ORDER = null;

  // --- State + persistens ---

  const STORAGE_KEY = 'byggbiten_kalkylator_v1';
  // Hårdkodad autentisering för denna lokala leverans. Användarnamn case-insensitivt.
  // 2026-04-22 v1.9: login är gatekeeper mot HSB, inte säkerhet. För publik demo på
  // GitHub Pages används "demo"/"demo" — uppenbart och friktionsfritt. För skarp
  // leverans till HSB: byt till hsbsundsvall/Byggbiten2026! innan repo görs privat
  // eller release-versionen byggs.
  const AUTH_USER = 'demo';
  const AUTH_PASSWORD = 'demo';

  // Del I/II (2026-04-22): kund/leverantör/mottagare för print + offert-flöde.
  // TODO (multi-kund): CUSTOMER_INFO är hårdkodad för HSB Sundsvall i v1.6. När
  // multi-kund-prompt körs: härled kunddata från state.auth.user eller separat
  // CUSTOMERS-karta, och låt login-flödet sätta rätt kund i state.customer.
  const CUSTOMER_INFO = {
    namn: 'HSB Sundsvall',
    adress: '[Adress ifylls av Dennis]',
    orgnr: '[Orgnr ifylls av Dennis]',
    kontakt: '[Kontaktperson hos HSB]'
  };
  const SUPPLIER_INFO = {
    namn: 'Byggbiten i Norrland AB',
    adress: 'Regementsvägen 4',
    postort: '852 38 Sundsvall',
    orgnr: '556875-4260',
    fskatt: 'Godkänd för F-skatt',
    tel: '070-235 65 55',
    email: 'info@byggbiten.nu',
    bankgiro: '825-3312',
    momsreg: 'SE556875426001'
  };
  const OMBUD_INFO = {
    namn: 'Dennis Sendelbach',
    email: 'dennis@byggbiten.nu',
    tel: '0704969141'
  };
  const OFFERT_RECIPIENT = 'dennis@byggbiten.nu';
  const MOMS_FAKTOR = 1.25;

  let state;
  let uiState = { modalOpen: false, loginError: null, renamingProjectId: null };

  function emptyCalc() {
    return {
      projektNamn: '',
      datum: window.APP_DATA.todayIso(),
      rum: []
    };
  }

  // Hjälpare: serialisera/deserialisera det som ska persistas.
  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  }

  let saveTimer = null;
  function persistState() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = null;
      try {
        const snapshot = {
          view: state.view,
          auth: state.auth,
          savedProjects: state.savedProjects,
          currentProjectId: state.currentProjectId,
          projektNamn: state.projektNamn,
          datum: state.datum,
          rum: state.rum
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      } catch (e) { /* ignore quota/serialization errors */ }
    }, 300);
  }

  function genProjectId() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  // --- Helpers ---

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function findRoom(id) {
    return state.rum.find((r) => r.id === id);
  }

  function findItem(rumTyp, itemId) {
    const rt = ROOM_TYPES[rumTyp];
    return rt ? rt.items.find((i) => i.id === itemId) : null;
  }

  // Stepper-HTML (upp/ner-knappar bredvid en numerisk input). `step`-värdet läses av
  // onStepperPointerDown för att öka/minska. Desimalvärden (t.ex. '0.1') bevarar en decimal.
  function stepperHtml(step) {
    return `
      <span class="stepper" data-step="${escapeHtml(String(step))}">
        <button type="button" class="stepper-up" aria-label="Öka">
          <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 5L5 1L9 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
        <button type="button" class="stepper-down" aria-label="Minska">
          <svg viewBox="0 0 10 6" width="10" height="6" aria-hidden="true"><path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </span>
    `;
  }

  function nextRoomId() {
    let n = state.rum.length + 1;
    while (state.rum.some((r) => r.id === 'r' + n)) n++;
    return 'r' + n;
  }

  // Prisförhandsvisning (för ikke-valda items): pris per m²/st utan multiplikation med antal.
  function getDisplayPrice(item, rum) {
    if (item.unit === 'schablon') return item.price;
    if (item.hasCount) return item.price;
    if (item.hasArea) return item.price * (item.defaultArea || 1);
    if (item.wallCalc) return item.price * calcWallArea(rum.yta, rum.takhojd);
    // 2026-04-22 (G): perimeterCalc saknades. Sockel/taklist visade 0 kr ocheckade.
    if (item.perimeterCalc) return item.price * window.APP_DATA.calcPerimeter(rum.yta);
    if (item.unit === 'kr/m²') {
      let yta = rum.yta;
      if (item.group === 'golv') {
        yta = Math.max(0, yta - (window.APP_DATA.reducedFloorArea(rum) || 0));
      }
      if (item.wallRatio) yta = yta * item.wallRatio;
      return item.price * yta;
    }
    return 0;
  }

  // Schablon-grey: returnerar true om item ska gråas ut eftersom en annan schablon är vald
  // i samma rum (och item inte tillhör samma group som den valda schablonen).
  function isItemDisabled(item, rum) {
    const rt = ROOM_TYPES[rum.typ];
    if (!rt) return false;
    for (const other of rt.items) {
      if (other.id === item.id) continue;
      const valt = rum.valda[other.id];
      if (!valt || !valt.checked) continue;
      if (other.unit === 'schablon') {
        // Samma group → alternativ, inte disabled.
        if (other.group && other.group === item.group) return false;
        return true;
      }
    }
    return false;
  }

  // --- Rendering ---

  function renderHeader() {
    return `
      <div class="header">
        <div class="logo-block">
          <img class="logo-img" src="assets/byggbiten-logga.svg" alt="Byggbiten i Norrland">
        </div>
        <div class="title-block">
          <div class="app-title">Renoveringskalkyl</div>
          <div class="app-subtitle">Överslag för bostadsrättsrenovering</div>
        </div>
      </div>
    `;
  }

  function renderMeta() {
    return `
      <div class="meta">
        <div class="meta-col">
          <div class="meta-label">Projekt</div>
          <input class="project-field" type="text" value="${escapeHtml(state.projektNamn)}" placeholder="Ange projektnamn" data-field="projektNamn">
        </div>
        <div class="date-block">
          <div class="meta-label">Datum</div>
          <div class="date-value">${escapeHtml(state.datum)}</div>
        </div>
      </div>
    `;
  }

  function renderAddRoom() {
    return `
      <button class="add-room" type="button" data-action="open-add-room">
        <svg class="plus-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Lägg till rum
      </button>
    `;
  }

  function renderEmptyState() {
    return `
      <div class="empty-state">
        <div class="empty-mark">${PUZZLE_SVG}</div>
        <h2 class="empty-title">Börja din kalkyl</h2>
        <p class="empty-body">
          Lägg till rum, ange kvadratmeter och kryssa för de åtgärder som ska ingå —
          så ser du en löpande totalsumma. Uppskattningen baseras på Byggbitens
          schablonpriser och är inte en bindande offert.
        </p>
        <ul class="empty-hints">
          <li>Flera rum av samma typ kan läggas till — perfekt för 2:or, 3:or och större.</li>
          <li>Kök och badrum räknas som schabloner, övriga rum specas post för post.</li>
          <li>Du kan skriva ut eller spara ditt överslag som PDF när du är klar.</li>
        </ul>
      </div>
    `;
  }

  function renderItem(item, rum) {
    const valt = rum.valda[item.id];
    const checked = !!(valt && valt.checked);
    const disabled = !checked && isItemDisabled(item, rum);
    const amount = calcItemTotal(item, valt, rum);
    const displayPrice = checked ? amount : getDisplayPrice(item, rum);
    const isPlaceholder = !!item.placeholder;
    const isSchablon = item.unit === 'schablon';
    const muted = mutedForItem(item, rum, checked);

    const tags = [];
    if (isSchablon) tags.push('<span class="tag tag-schablon">Schablon</span>');
    if (isPlaceholder) tags.push('<span class="tag tag-placeholder">Preliminärt pris</span>');
    // 2026-04-22: tagLabel för UE-VS / UE-El-badges. Distinkt från Schablon + Placeholder.
    if (item.tagLabel === 'UE-VS') {
      tags.push('<span class="tag tag-ue tag-ue-vs">UE-VS</span>');
    } else if (item.tagLabel === 'UE-El') {
      tags.push('<span class="tag tag-ue tag-ue-el">UE-El</span>');
    } else if (item.tagLabel) {
      // Generisk fallback för framtida tagLabel-värden
      tags.push(`<span class="tag">${escapeHtml(item.tagLabel)}</span>`);
    }

    let countCell = '<span></span>';
    if (item.hasCount) {
      countCell = `<span class="item-count-wrap">
          <input class="item-count" type="text" inputmode="numeric" value="${escapeHtml(String((valt && valt.count) || 0))}" data-item-id="${escapeHtml(item.id)}">
          ${stepperHtml('1')}
        </span>`;
    } else if (item.hasArea) {
      countCell = `<span class="item-count-wrap">
          <input class="item-count item-count-area" type="text" inputmode="decimal" value="${escapeHtml(String((valt && valt.area) || 0))}" data-item-id="${escapeHtml(item.id)}" data-area-input="true">
          <span class="item-count-unit">m²</span>
          ${stepperHtml('1')}
        </span>`;
    }

    const labelTitle = item.tooltip ? ` title="${escapeHtml(item.tooltip)}"` : '';
    const expanded = state.expandedItems && state.expandedItems.has(item.id);
    const hasInfo = itemHasInfo(item);
    const chevronCell = hasInfo
      ? `<button class="item-chevron${expanded ? ' is-expanded' : ''}" type="button" data-action="toggle-item-details" data-item-id="${escapeHtml(item.id)}" aria-label="Visa detaljer" aria-expanded="${expanded ? 'true' : 'false'}">
           <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
         </button>`
      : '<span class="item-chevron-placeholder" aria-hidden="true"></span>';

    return `
      <div class="item${disabled ? ' disabled' : ''}${expanded ? ' is-expanded' : ''}" data-item-id="${escapeHtml(item.id)}">
        <span class="checkbox${checked ? ' checked' : ''}" data-action="toggle-item" data-item-id="${escapeHtml(item.id)}"></span>
        <span class="item-label"${labelTitle}>${escapeHtml(item.label)}${tags.length ? ' ' + tags.join(' ') : ''}</span>
        ${countCell}
        <span class="item-price${muted ? ' muted' : ''}">${formatKr(displayPrice)}</span>
        ${chevronCell}
      </div>
      ${expanded && hasInfo ? renderItemDetailsPanel(item) : ''}
    `;
  }

  // Bugfix #IV: grå summa när posten inte bidrar till totalen.
  function mutedForItem(item, rum, checked) {
    if (!checked) return true;
    if (item.hasCount && (!(rum.valda[item.id]) || (rum.valda[item.id].count || 0) === 0)) return true;
    return false;
  }

  // Del III helper: finns det tillräckligt med info för att motivera chevron?
  function itemHasInfo(item) {
    const i = item.info;
    if (!i) return false;
    const hasIngar = Array.isArray(i.ingar) && i.ingar.length > 0;
    const hasIngarEj = Array.isArray(i.ingarEj) && i.ingarEj.length > 0;
    const hasRef = !!i.wikellsRef;
    return hasIngar || hasIngarEj || hasRef;
  }

  // --- Del I (2026-04-22): PDF-export som kalkylbudget ---

  // Extrahera Wikells-kod ur ref-sträng. Matchar 1–2 siffror, punkt, 3 siffror
  // (t.ex. '15.016', '14.038', '8.502' — Dennis-egna 8.xxx fångas också).
  function extractWikellsId(ref) {
    if (!ref) return '';
    const m = String(ref).match(/(\d{1,2}\.\d{3})/);
    return m ? m[1] : '';
  }

  // Sanitera sträng till filnamn (HSB-format). Max 60 tecken, å/ä/ö → a/a/o.
  function sanitizeFilename(str) {
    return (str || 'Namnlos')
      .replace(/å/gi, 'a').replace(/ä/gi, 'a').replace(/ö/gi, 'o')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 60);
  }

  // Samla strukturerad data för print-rendering. Återanvänder calcItemTotal/
  // calcFollowupTotal/calcRoomSubtotal — adderar bara inkl-moms-kolumner.
  function buildPrintData(st) {
    const rum = [];
    const sammanstallning = [];
    let totalNetto = 0;

    for (const r of (st.rum || [])) {
      const rt = ROOM_TYPES[r.typ];
      if (!rt) continue;
      const namn = (r.namn || '').trim() || rt.displayName;
      const rader = [];

      // Huvud-items som är kryssade ELLER har kryssade följeposter.
      for (const item of rt.items) {
        const valt = r.valda[item.id];
        const checked = !!(valt && valt.checked);
        const itemAmount = window.APP_DATA.calcItemTotal(item, valt, r);
        if (checked && itemAmount > 0) {
          const mangd = itemMangdFor(item, valt, r);
          const enh = itemEnhFor(item);
          rader.push({
            kod: extractWikellsId(item.info && item.info.wikellsRef),
            label: item.label,
            enh,
            mangd,
            prisEnh: item.price,
            netto: Math.round(itemAmount),
            inklMoms: Math.round(itemAmount * MOMS_FAKTOR),
            isFollowup: false
          });
        }
        // Typ A-följeposter (per-huvudpost) — visa bara om parent är kryssad + fu kryssad.
        if (checked && item.followups) {
          for (const fu of item.followups) {
            const fuValt = r.valda[fu.id];
            if (!fuValt || !fuValt.checked) continue;
            const fuAmount = window.APP_DATA.calcFollowupTotal(fu, item, r, valt);
            if (fuAmount <= 0) continue;
            rader.push({
              kod: '',
              label: fu.label,
              enh: fu.unit === 'kr/m²' ? 'm²' : 'st',
              mangd: followupMangdFor(fu, item, r, valt),
              prisEnh: fu.price,
              netto: Math.round(fuAmount),
              inklMoms: Math.round(fuAmount * MOMS_FAKTOR),
              isFollowup: true
            });
          }
        }
      }

      // Typ B (rums-scope) — bara om triggered + kryssad.
      for (const rfu of (rt.roomFollowups || [])) {
        const rfuValt = r.valda[rfu.id];
        if (!rfuValt || !rfuValt.checked) continue;
        if (!window.APP_DATA.isRoomFollowupTriggered(rfu, r)) continue;
        const amt = window.APP_DATA.calcFollowupTotal(rfu, null, r, null);
        if (amt <= 0) continue;
        rader.push({
          kod: extractWikellsId(rfu.info && rfu.info.wikellsRef),
          label: rfu.label,
          enh: rfu.unit === 'kr/m²' ? 'm²' : rfu.unit === 'schablon' ? 'st' : rfu.unit,
          mangd: rfu.unit === 'kr/m²' ? r.yta : 1,
          prisEnh: rfu.price,
          netto: Math.round(amt),
          inklMoms: Math.round(amt * MOMS_FAKTOR),
          isFollowup: true
        });
      }

      const rumTotalNetto = Math.round(window.APP_DATA.calcRoomSubtotal(r));
      const rumTotalInkl = Math.round(rumTotalNetto * MOMS_FAKTOR);
      totalNetto += rumTotalNetto;
      if (rader.length > 0 || rumTotalNetto > 0) {
        rum.push({
          namn,
          yta: rt.hideArea ? null : r.yta,
          kategori: rt.displayName,
          rader,
          rumTotalNetto,
          rumTotalInkl
        });
        sammanstallning.push({ rum: namn, netto: rumTotalNetto, inkl: rumTotalInkl });
      }
    }

    const totalInkl = Math.round(totalNetto * MOMS_FAKTOR);
    return {
      header: {
        kalkylNamn: (st.projektNamn || '').trim() || '(namnlös kalkyl)',
        datum: st.datum || window.APP_DATA.todayIso(),
        kund: CUSTOMER_INFO,
        leverantor: SUPPLIER_INFO,
        ombud: OMBUD_INFO
      },
      rum,
      sammanstallning,
      totalNetto,
      totalInkl
    };
  }

  function itemMangdFor(item, valt, rum) {
    if (item.hasCount) return (valt && valt.count) || 0;
    if (item.hasArea) return (valt && valt.area) || 0;
    if (item.unit === 'schablon') return 1;
    if (item.wallCalc) return Math.round(window.APP_DATA.calcWallArea(rum.yta, rum.takhojd) * 10) / 10;
    if (item.perimeterCalc) return Math.round(window.APP_DATA.calcPerimeter(rum.yta) * 10) / 10;
    if (item.unit === 'kr/m²') {
      let yta = rum.yta;
      if (item.group === 'golv') yta = Math.max(0, yta - window.APP_DATA.reducedFloorArea(rum));
      return Math.round(yta * 10) / 10;
    }
    return 0;
  }

  function itemEnhFor(item) {
    if (item.hasCount) return 'st';
    if (item.unit === 'schablon') return 'st';
    if (item.wallCalc || item.unit === 'kr/m² vägg') return 'm² v';
    if (item.perimeterCalc || item.unit === 'kr/m') return 'm';
    if (item.unit === 'kr/m²') return 'm²';
    if (item.unit === 'kr/st') return 'st';
    return item.unit || '';
  }

  function followupMangdFor(fu, parentItem, rum, parentValt) {
    if (fu.unit === 'kr/m²') {
      if (parentItem && parentItem.hasArea && fu.inheritsParentArea) {
        return Math.round(((parentValt && parentValt.area) || 0) * 10) / 10;
      }
      if (parentItem && parentItem.group === 'golv' && fu.inheritsReducesFloor) {
        return Math.round(Math.max(0, rum.yta - window.APP_DATA.reducedFloorArea(rum)) * 10) / 10;
      }
      return Math.round(rum.yta * 10) / 10;
    }
    return 1;
  }

  // Rendera print-layouten in i #print-layout-diven. Körs i beforeprint-eventet.
  function renderPrintLayout() {
    const container = document.getElementById('print-layout');
    if (!container) return;
    const data = buildPrintData(state);
    container.innerHTML = buildPrintHtml(data);
  }

  // Trigga utskrift — sätter document.title temporärt till sanitiserat filnamn
  // så webbläsaren föreslår t.ex. "Kalkylbudget_Strindbergsvagen4B_2026-04-22.pdf"
  // som default i Spara-som-PDF-dialogen. Återställer efter utskrift.
  function triggerPrint() {
    const prevTitle = document.title;
    const safeName = sanitizeFilename(state.projektNamn);
    const safeDate = state.datum || window.APP_DATA.todayIso();
    document.title = `Kalkylbudget_${safeName}_${safeDate}`;
    // Renderingsjobbet körs i beforeprint-listenern, men vi kör det också inline
    // för att vara säkra även om beforeprint inte eldar i alla miljöer.
    renderPrintLayout();
    window.print();
    setTimeout(() => { document.title = prevTitle; }, 500);
  }

  function buildPrintHtml(data) {
    const d = data;
    const kund = d.header.kund;
    const sup = d.header.leverantor;
    const omb = d.header.ombud;

    const roomsHtml = d.rum.map((rm) => {
      const title = rm.yta != null ? `${escapeHtml(rm.namn)} — ${escapeHtml(String(rm.yta))} m²` : escapeHtml(rm.namn);
      const rowsHtml = rm.rader.map((r) => `
        <tr${r.isFollowup ? ' class="is-followup"' : ''}>
          <td>${escapeHtml(r.kod || '')}</td>
          <td>${escapeHtml(r.label)}</td>
          <td>${escapeHtml(r.enh)}</td>
          <td class="num">${formatNumSv(r.mangd)}</td>
          <td class="num">${formatNumSv(r.prisEnh)}</td>
          <td class="num">${formatNumSv(r.netto)}</td>
          <td class="num">${formatNumSv(r.inklMoms)}</td>
        </tr>
      `).join('');
      return `
        <div class="print-room">
          <div class="print-room-title">${title}</div>
          <table class="print-table">
            <thead>
              <tr>
                <th style="width:12%">Kod</th>
                <th style="width:38%">Benämning</th>
                <th style="width:7%">Enh</th>
                <th style="width:9%" class="num">Mängd</th>
                <th style="width:10%" class="num">Pris/enh</th>
                <th style="width:12%" class="num">Netto</th>
                <th style="width:12%" class="num">Inkl moms</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="is-room-total">
                <td colspan="5" style="text-align:right">Rum-total</td>
                <td class="num">${formatNumSv(rm.rumTotalNetto)}</td>
                <td class="num">${formatNumSv(rm.rumTotalInkl)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    const sammanstallningRowsHtml = d.sammanstallning.map((s) => `
      <tr>
        <td>${escapeHtml(s.rum)}</td>
        <td class="num">${formatNumSv(s.netto)}</td>
        <td class="num">${formatNumSv(s.inkl)}</td>
      </tr>
    `).join('');

    const rumLista = d.rum.map((r) => (r.namn || '').toLowerCase()).join(', ');
    const footer = `
      <div class="print-footer">
        <span>${escapeHtml(sup.namn)} &nbsp;|&nbsp; ${escapeHtml(sup.adress)}, ${escapeHtml(sup.postort)}
        &nbsp;|&nbsp; Tfn ${escapeHtml(sup.tel)} &nbsp;|&nbsp; ${escapeHtml(sup.email)}
        &nbsp;|&nbsp; Bankgiro ${escapeHtml(sup.bankgiro)} &nbsp;|&nbsp; Momsreg ${escapeHtml(sup.momsreg)}</span>
      </div>
    `;

    return `
      <div class="print-page">
        <div class="print-header-row">
          <img class="print-logo" src="assets/byggbiten_logga_transparent_beskuren.svg" alt="Byggbiten">
          <div class="print-title">KALKYLBUDGET</div>
          <div class="print-date-box">
            <div class="print-date-label">KALKYLDATUM</div>
            <div class="print-date-value">${escapeHtml(d.header.datum)}</div>
          </div>
        </div>

        <div class="print-blocks">
          <div>
            <div class="print-block-label">Kalkylnamn / projekt</div>
            <div>${escapeHtml(d.header.kalkylNamn)}</div>
          </div>
          <div>
            <div class="print-block-label">Kund</div>
            <div>${escapeHtml(kund.namn)}</div>
            <div>${escapeHtml(kund.adress)}</div>
          </div>
          <div>
            <div class="print-block-label">Leverantör</div>
            <div>${escapeHtml(sup.namn)}</div>
            <div>${escapeHtml(sup.adress)}</div>
            <div>${escapeHtml(sup.postort)}</div>
            <div>Org/personnummer: ${escapeHtml(sup.orgnr)}</div>
            <div>${escapeHtml(sup.fskatt)}</div>
          </div>
          <div>
            <div class="print-block-label">Kontakt</div>
            <div>${escapeHtml(kund.kontakt)}</div>
          </div>
          <div>
            <div class="print-block-label">Ombud / kalkylansvarig</div>
            <div>${escapeHtml(omb.namn)}</div>
            <div>${escapeHtml(omb.email)} &nbsp; ${escapeHtml(omb.tel)}</div>
          </div>
        </div>

        <div class="print-section-title">Arbetsbeskrivning</div>
        <p class="print-paragraph">
          Kalkylbudget för renovering av bostadsrätten.
          ${rumLista ? 'Omfattar: ' + escapeHtml(rumLista) + '.' : ''}
          Kalkylen är baserad på Byggbitens kalibrerade schablonpriser och utgör ej bindande pris.
        </p>

        ${roomsHtml || '<p class="print-paragraph"><em>Inga rum i kalkylen.</em></p>'}

        ${footer}
      </div>

      <div class="print-page print-page-break">
        <div class="print-header-row">
          <img class="print-logo" src="assets/byggbiten_logga_transparent_beskuren.svg" alt="Byggbiten">
          <div class="print-title">KALKYLBUDGET</div>
          <div class="print-date-box">
            <div class="print-date-label">KALKYLDATUM</div>
            <div class="print-date-value">${escapeHtml(d.header.datum)}</div>
          </div>
        </div>

        <div class="print-section-title">Sammanställning</div>
        <table class="print-table print-sammanstallning">
          <thead>
            <tr>
              <th style="width:60%">Rum</th>
              <th style="width:20%" class="num">Netto (kr)</th>
              <th style="width:20%" class="num">Inkl moms (kr)</th>
            </tr>
          </thead>
          <tbody>
            ${sammanstallningRowsHtml}
            <tr class="is-grand-total">
              <td><strong>TOTALT</strong></td>
              <td class="num"><strong>${formatNumSv(d.totalNetto)}</strong></td>
              <td class="num"><strong>${formatNumSv(d.totalInkl)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="print-section-title">Om denna kalkylbudget</div>
        <p class="print-paragraph">
          Kalkylbudgeten är en vägledande prisuppskattning baserad på Byggbitens schablonpriser för
          bostadsrättsrenovering 2026. Slutligt pris sätts i offert efter platsbesök.
        </p>

        <div class="print-section-title">Ingår ej</div>
        <ul class="print-paragraph">
          <li>Bygglovskostnader</li>
          <li>Föroreningar eller extra åtgärder i mark</li>
          <li>Anslutningsavgifter</li>
          <li>Hyra av tillfälligt boende under renovering</li>
        </ul>

        <div class="print-section-title">Nästa steg</div>
        <p class="print-paragraph">
          Vid intresse av skarp offert — kontakta Byggbiten för platsbesök. Vi återkommer med bindande pris inom 5 arbetsdagar.
        </p>

        ${footer}
      </div>
    `;
  }

  // Formatera tal med svensk tusensep (mellanslag) — utan "kr"-suffix (kolumn heter redan "kr").
  function formatNumSv(n) {
    if (n == null || isNaN(n)) return '';
    const rounded = Math.round(n * 10) / 10;
    return rounded.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
  }

  // Del III: expand-panel under item-raden. item.info = { ingar, ingarEj, wikellsRef, image }.
  function renderItemDetailsPanel(item) {
    const info = item.info || {};
    const ingar = Array.isArray(info.ingar) ? info.ingar : [];
    const ingarEj = Array.isArray(info.ingarEj) ? info.ingarEj : [];
    const ref = info.wikellsRef || '';
    const ingarHtml = ingar.length
      ? `<div class="item-details-block">
           <div class="item-details-label">Ingår</div>
           <ul class="item-details-list">${ingar.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
         </div>`
      : '';
    const ingarEjHtml = ingarEj.length
      ? `<div class="item-details-block">
           <div class="item-details-label">Ingår ej</div>
           <ul class="item-details-list">${ingarEj.map((x) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>
         </div>`
      : '';
    const refHtml = ref ? `<div class="item-details-ref">${escapeHtml(ref)}</div>` : '';
    return `
      <div class="item-details-panel" data-for-item="${escapeHtml(item.id)}">
        ${ingarHtml}
        ${ingarEjHtml}
        ${refHtml}
      </div>
    `;
  }

  // --- FÖLJEPOST-RENDERING ---

  // Typ A: indenterad rad under parent. Renderas bara när parent är kryssad.
  // Bugfix #66 (2026-04-22): data-action på <div class="followup-row"> i stället för
  // bara checkbox-spannen → hela raden blir klickbar (label, pris, checkbox alla togglar).
  function renderFollowup(fu, parentItem, rum) {
    const valt = rum.valda[fu.id];
    const checked = !!(valt && valt.checked);
    const parentValt = rum.valda[parentItem.id];
    const price = window.APP_DATA.calcFollowupTotal(fu, parentItem, rum, parentValt);
    const displayPrice = checked ? price : 0;
    // Del IV: muted när följeposten inte bidrar (unchecked eller 0 kr).
    const muted = !checked || displayPrice === 0;
    return `
      <div class="followup-row${checked ? '' : ' is-unchecked'}" data-action="toggle-followup" data-followup-id="${escapeHtml(fu.id)}">
        <span class="followup-indent" aria-hidden="true">└</span>
        <span class="checkbox${checked ? ' checked' : ''}"></span>
        <span class="followup-label">${escapeHtml(fu.label)}</span>
        <span class="item-price${muted ? ' muted' : ''}">${formatKr(displayPrice)}</span>
      </div>
    `;
  }

  // Typ B: rums-scope. Visas alltid i sin renderInCategory-sektion. Dimmad när trigger saknas.
  // Bugfix #66 (2026-04-22): data-action på <div class="followup-row"> när triggered=true;
  // utelämnas helt när triggered=false så klick inte togglar en dimmad rad.
  function renderRoomFollowup(rfu, rum) {
    const valt = rum.valda[rfu.id];
    const userChecked = !!(valt && valt.checked);
    const triggered = window.APP_DATA.isRoomFollowupTriggered(rfu, rum);
    const active = triggered && userChecked;
    const displayPrice = active ? window.APP_DATA.calcFollowupTotal(rfu, null, rum, null) : 0;
    const classes = ['followup-row', 'followup-room-scope'];
    if (!triggered) classes.push('is-dimmed');
    if (!userChecked) classes.push('is-unchecked');
    const title = triggered ? '' : ' title="Aktiveras när målning väljs"';
    const rowAction = triggered ? ` data-action="toggle-followup"` : '';
    // Del IV: muted när inte aktiv (ingen trigger eller unchecked eller 0 kr).
    const muted = !active || displayPrice === 0;
    return `
      <div class="${classes.join(' ')}"${rowAction} data-followup-id="${escapeHtml(rfu.id)}"${title}>
        <span class="followup-indent" aria-hidden="true">·</span>
        <span class="checkbox${userChecked ? ' checked' : ''}${triggered ? '' : ' is-disabled'}"></span>
        <span class="followup-label">${escapeHtml(rfu.label)}</span>
        <span class="item-price${muted ? ' muted' : ''}">${formatKr(displayPrice)}</span>
      </div>
    `;
  }

  // Bygger items+följeposter-HTML för ett rum. Används både av renderRoom (bootstrap)
  // och av rerenderRoomBodyDOM (efter toggle-item eller toggle-followup).
  function renderRoomBody(rum) {
    const roomType = ROOM_TYPES[rum.typ];
    if (!roomType) return '';
    const pieces = [];
    let lastCategory = null;
    const roomFollowups = roomType.roomFollowups || [];

    for (let i = 0; i < roomType.items.length; i++) {
      const item = roomType.items[i];
      const cat = item.category || null;
      const nextItem = roomType.items[i + 1];
      const nextCat = nextItem ? (nextItem.category || null) : null;

      if (cat && cat !== lastCategory) {
        pieces.push(`<div class="room-divider"><span>${escapeHtml(cat)}</span></div>`);
      }
      pieces.push(renderItem(item, rum));

      // Typ A-följeposter (bara när parent är kryssad)
      if (item.followups && rum.valda[item.id] && rum.valda[item.id].checked) {
        for (const fu of item.followups) {
          pieces.push(renderFollowup(fu, item, rum));
        }
      }

      lastCategory = cat;

      // När vi lämnar en kategori (eller är sista item): lägg in typ B för just den kategorin.
      if (cat && cat !== nextCat) {
        for (const rfu of roomFollowups) {
          if (rfu.renderInCategory === cat) {
            pieces.push(renderRoomFollowup(rfu, rum));
          }
        }
      }
    }
    return pieces.join('');
  }

  // Uppdaterar rummets items+följeposter-del utan att röra header/footer.
  function rerenderRoomBodyDOM(rum) {
    const body = document.querySelector(`.room[data-room-id="${CSS.escape(rum.id)}"] .room-body`);
    if (!body) return;
    body.innerHTML = renderRoomBody(rum);
  }

  // Legacy-notis: visas om rum.typ==='badrum' och rum har gamla schablonposter
  // (badrum_standard/badrum_plus) kryssade. Dessa ignoreras av nya items (bidrar 0 kr)
  // men notisen förklarar varför priset ser annorlunda ut än kundens tidigare kalkyl.
  function renderLegacyBadrumNotice(rum) {
    if (rum.typ !== 'badrum') return '';
    const hasOldStandard = rum.valda.badrum_standard && rum.valda.badrum_standard.checked;
    const hasOldPlus = rum.valda.badrum_plus && rum.valda.badrum_plus.checked;
    if (!hasOldStandard && !hasOldPlus) return '';
    return `
      <div class="room-legacy-notice" role="note">
        <svg class="room-legacy-notice-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
          <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        <span>Denna kalkyl är sparad före 2026-04-22 då badrum blev per-post. Välj om materialen för att få rätt pris.</span>
      </div>
    `;
  }

  function renderRoom(rum) {
    const roomType = ROOM_TYPES[rum.typ];
    if (!roomType) return '';
    const itemsHtml = renderRoomBody(rum);
    const subtotal = calcRoomSubtotal(rum);

    // Yta-input visas som standard men kan döljas via rumstyp-flagga (t.ex. "Övrigt").
    const hideArea = !!roomType.hideArea;
    const ytaHtml = hideArea
      ? ''
      : `<span class="room-area">
          <input type="text" inputmode="numeric" value="${escapeHtml(String(rum.yta))}" data-field="yta">
          <span>m²</span>
          ${stepperHtml('1')}
        </span>`;
    // Takhöjd-input visas bara om rumstypen innehåller väggbaserade poster.
    const hasWallItems = roomType.items.some((i) => i.wallCalc);
    const takhojdValue = rum.takhojd != null ? rum.takhojd : DEFAULT_CEILING_HEIGHT;
    const takhojdHtml = hasWallItems
      ? `<span class="room-takhojd" title="Används för att räkna väggyta: omkrets × takhöjd">
          <span class="room-takhojd-label">takhöjd</span>
          <input type="text" inputmode="decimal" value="${escapeHtml(String(takhojdValue).replace('.', ','))}" data-field="takhojd">
          <span>m</span>
          ${stepperHtml('0.1')}
        </span>`
      : '';

    const customName = (rum.namn || '').trim();
    const nameHtml = `
      <span class="room-name">
        <input class="room-name-input" type="text" value="${escapeHtml(rum.namn || '')}" placeholder="${escapeHtml(roomType.displayName)}" data-field="namn" aria-label="Rumsnamn">
        <span class="room-name-subtitle"${customName ? '' : ' hidden'}>Kategori ${escapeHtml(roomType.displayName)}</span>
      </span>
    `;

    return `
      <div class="room" data-room-id="${escapeHtml(rum.id)}">
        <div class="room-drag-handle" title="Dra för att flytta" aria-label="Flytta rum">
          <svg viewBox="0 0 24 12" width="24" height="12" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="4" cy="3" r="1.3" fill="currentColor"/>
            <circle cx="12" cy="3" r="1.3" fill="currentColor"/>
            <circle cx="20" cy="3" r="1.3" fill="currentColor"/>
            <circle cx="4" cy="9" r="1.3" fill="currentColor"/>
            <circle cx="12" cy="9" r="1.3" fill="currentColor"/>
            <circle cx="20" cy="9" r="1.3" fill="currentColor"/>
          </svg>
        </div>
        <div class="room-head">
          <div class="room-title">
            <div class="room-mark">${roomType.icon || PUZZLE_SVG}</div>
            ${nameHtml}
            ${ytaHtml}
            ${takhojdHtml}
          </div>
          <button class="room-remove" type="button" data-action="remove-room">Ta bort</button>
        </div>
        ${renderLegacyBadrumNotice(rum)}
        <div class="room-body">${itemsHtml}</div>
        <div class="room-foot">
          <span class="subtotal-label">Delsumma</span>
          <span class="subtotal-value">${formatKr(subtotal)}</span>
        </div>
      </div>
    `;
  }

  function renderTotal() {
    const total = calcTotal(state);
    const antalRum = state.rum.length;
    const roomNames = state.rum
      .map((r) => ROOM_TYPES[r.typ] && ROOM_TYPES[r.typ].displayName.toLowerCase())
      .filter(Boolean)
      .join(', ');

    return `
      <div class="total-wrap">
        <div class="total">
          <div class="total-head">
            <span class="total-title">Total uppskattad kostnad</span>
            <span class="total-meta">ex. moms</span>
          </div>
          <div class="total-amount" data-total="${total}">${formatKr(total)}</div>
          <div class="total-rooms">${antalRum} rum${roomNames ? ' · ' + escapeHtml(roomNames) : ''}</div>

          <div class="total-actions">
            <button class="btn btn-primary" type="button" data-action="print">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" stroke-width="1.5"/>
                <path d="M14 2v6h6M8 13h8M8 17h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
              Skriv ut / spara som PDF
            </button>
            <button class="btn btn-secondary" type="button" data-action="request-quote">Begär offert</button>
          </div>

          <p class="disclaimer">
            Uppskattning baseras på Byggbitens schablonpriser för bostadsrättsrenovering 2026.
            Slutligt pris ges i offert efter platsbesök.
          </p>
        </div>
      </div>
    `;
  }

  // --- Sidebar (vänster-navigation) ---

  function renderSidebar() {
    const itemsHtml = state.rum.map((rum) => {
      const rt = ROOM_TYPES[rum.typ];
      if (!rt) return '';
      const displayName = (rum.namn && rum.namn.trim()) || rt.displayName;
      const metaParts = [];
      if (!rt.hideArea && rum.yta > 0) metaParts.push(rum.yta + ' m²');
      if (rum.namn && rum.namn.trim()) metaParts.push(rt.displayName.toLowerCase());
      const metaHtml = metaParts.length
        ? `<span class="sidebar-item-meta">${escapeHtml(metaParts.join(' · '))}</span>`
        : '';
      return `
        <button class="sidebar-item" type="button" data-nav-target="${escapeHtml(rum.id)}">
          <span class="sidebar-item-icon">${rt.icon || PUZZLE_SVG}</span>
          <span class="sidebar-item-text">
            <span class="sidebar-item-name">${escapeHtml(displayName)}</span>
            ${metaHtml}
          </span>
        </button>
      `;
    }).join('');
    return `
      <div class="sidebar-inner">
        <div class="sidebar-header">
          <span class="sidebar-title">Rum</span>
          <span class="sidebar-count">${state.rum.length}</span>
        </div>
        <nav class="sidebar-nav">${itemsHtml}</nav>
        <div class="sidebar-divider"></div>
        <button class="sidebar-add" type="button" data-action="open-add-room">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          Lägg till rum
        </button>
      </div>
    `;
  }

  // Placeholders för kommande flöden — spara projekt, gå tillbaka till startvy.
  function renderSidebarActions() {
    return `
      <div class="sidebar-actions">
        <button class="sidebar-action-btn" type="button" data-action="save-calc">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>
          Spara kalkyl
        </button>
        <button class="sidebar-action-btn sidebar-action-btn--ghost" type="button" data-action="go-home">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>
          Återgå till hemvy
        </button>
      </div>
    `;
  }

  // Byter ut sidebarens innerHTML (används vid add/remove/reorder/rename av rum).
  function updateSidebarDOM() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;
    sidebar.innerHTML = renderSidebar() + renderSidebarActions();
    setupScrollSpy();
  }

  // Scroll-spy: markerar aktiv sidebar-item baserat på vilket rum som är närmast
  // en fokuszon nära toppen av viewporten. Använder både IntersectionObserver (kör
  // updateActiveFromScroll vid intersection-byten) och scroll-event (uppdaterar under scroll).
  let scrollSpy = null;
  function setupScrollSpy() {
    if (scrollSpy) { scrollSpy.disconnect(); scrollSpy = null; }
    const rooms = document.querySelectorAll('.room');
    if (!rooms.length) return;

    scrollSpy = new IntersectionObserver(() => updateActiveFromScroll(), {
      rootMargin: '0px 0px 0px 0px',
      threshold: [0, 0.25, 0.5, 0.75, 1]
    });
    rooms.forEach((r) => scrollSpy.observe(r));

    // Initial markering + rAF-polling av scrollY (pålitligare än scroll-event i vissa
    // preview/iframe-kontexter där scroll-event inte bubblar till window).
    updateActiveFromScroll();
    if (!window._scrollSpyRunning) {
      window._scrollSpyRunning = true;
      let lastY = -1;
      function pollScroll() {
        if (!window._scrollSpyRunning) return;
        const y = window.scrollY;
        if (y !== lastY) {
          lastY = y;
          updateActiveFromScroll();
        }
        requestAnimationFrame(pollScroll);
      }
      requestAnimationFrame(pollScroll);
    }
  }

  function updateActiveFromScroll() {
    const rooms = document.querySelectorAll('.room');
    if (!rooms.length) return;
    // Fokuszon: 25% från viewporttoppen — sidebar markerar det rum vars top är närmast zon.
    const targetY = window.innerHeight * 0.25;
    let best = null;
    let bestDistance = Infinity;
    rooms.forEach((r) => {
      const rect = r.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const distance = Math.abs(rect.top - targetY);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = r;
      }
    });
    if (!best) return;
    const rumId = best.dataset.roomId;
    document.querySelectorAll('.sidebar-item').forEach((el) => {
      el.classList.toggle('active', el.dataset.navTarget === rumId);
    });
  }

  function renderAddRoomModal() {
    if (!uiState.modalOpen) return '';
    const options = ROOM_TYPE_ORDER.map((key) => {
      const rt = ROOM_TYPES[key];
      const prissattning = rt.type === 'schablon' ? 'schablon' : 'per post';
      const meta = rt.hideArea
        ? 'Styck-tillval'
        : `Standard ${rt.defaultArea} m² · ${prissattning}`;
      return `
        <button class="room-option" type="button" data-action="add-room" data-type="${escapeHtml(key)}">
          <span class="room-option-mark">${rt.icon || PUZZLE_SVG}</span>
          <span class="room-option-text">
            <span class="room-option-name">${escapeHtml(rt.displayName)}</span>
            <span class="room-option-meta">${escapeHtml(meta)}</span>
          </span>
        </button>
      `;
    }).join('');

    return `
      <div class="modal-backdrop" data-action="close-modal">
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <div class="modal-head">
            <h3 class="modal-title" id="modal-title">Välj rumstyp</h3>
            <button class="modal-close" type="button" data-action="close-modal" aria-label="Stäng">×</button>
          </div>
          <div class="modal-body">
            ${options}
          </div>
        </div>
      </div>
    `;
  }

  // Del II (2026-04-22): offert-modal. Trestegs-UI — spara PDF + välj mejlklient +
  // bifoga själv. Renderas i en egen modal-backdrop (separat från add-room).
  function renderOffertModal() {
    const saved = !!uiState.offertPdfSaved;
    return `
      <div class="modal-backdrop" data-action="close-offert-modal">
        <div class="modal offert-modal" role="dialog" aria-modal="true" aria-labelledby="offert-title">
          <div class="modal-head">
            <h3 class="modal-title" id="offert-title">Begär offert</h3>
            <button class="modal-close" type="button" data-action="close-offert-modal" aria-label="Stäng">×</button>
          </div>
          <div class="modal-body offert-body">
            <div class="offert-step">
              <div class="offert-step-num">1</div>
              <div class="offert-step-content">
                <div class="offert-step-title">Spara kalkylen som PDF</div>
                <div class="offert-step-desc">PDF:en bifogas i mejlet du skickar till Byggbiten.</div>
                <div class="offert-step-actions">
                  <button class="btn btn-primary" type="button" data-action="offert-save-pdf">Spara PDF</button>
                  ${saved ? '<span class="offert-saved-badge">✓ Sparat</span>' : ''}
                </div>
              </div>
            </div>
            <div class="offert-step">
              <div class="offert-step-num">2</div>
              <div class="offert-step-content">
                <div class="offert-step-title">Öppna mejl i</div>
                <div class="offert-step-desc">Välj klient — vi förifyller mottagare, ämne och brödtext.</div>
                <div class="offert-step-actions">
                  <button class="btn btn-secondary" type="button" data-action="offert-open-native">Inbyggt mejl</button>
                  <button class="btn btn-secondary" type="button" data-action="offert-open-gmail">Gmail</button>
                  <button class="btn btn-secondary" type="button" data-action="offert-open-outlook">Outlook</button>
                </div>
              </div>
            </div>
            <div class="offert-step">
              <div class="offert-step-num">3</div>
              <div class="offert-step-content">
                <div class="offert-step-title">Bifoga PDF:en och tryck Skicka</div>
                <div class="offert-step-desc">Dra PDF-filen från steg 1 till mejlet. Tekniska gränser gör att vi inte kan bifoga automatiskt.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function openOffertModal() {
    if (document.querySelector('.offert-modal')) return;
    uiState.offertPdfSaved = false;
    const wrap = document.createElement('div');
    wrap.innerHTML = renderOffertModal();
    document.body.appendChild(wrap.firstElementChild);
  }
  function closeOffertModal() {
    uiState.offertPdfSaved = false;
    const backdrop = document.querySelector('.modal-backdrop');
    // Stäng bara om det är vår offert-modal (inte add-room).
    if (backdrop && backdrop.querySelector('.offert-modal')) backdrop.remove();
  }
  function rerenderOffertModal() {
    const backdrop = document.querySelector('.modal-backdrop');
    if (!backdrop || !backdrop.querySelector('.offert-modal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = renderOffertModal();
    backdrop.replaceWith(wrap.firstElementChild);
  }

  // Bygger mailto/Gmail/Outlook-URL med förifyllda fält. URL-kodar ämne + brödtext.
  function buildOffertMailFields() {
    const projekt = (state.projektNamn || '').trim() || 'namnlös kalkyl';
    const datum = state.datum || window.APP_DATA.todayIso();
    const user = (state.auth && state.auth.user) || '';
    const subject = `${projekt} — ${datum}`;
    const body = `Hej Dennis,\n\nVi önskar skarp offert för ${projekt}. Återkom gärna för mer information eller platsbesök.\n\nKalkyl-PDF bifogas.\n\nVänliga hälsningar,\n${user}`;
    return { subject, body };
  }

  // Router-render: väljer rätt top-level vy baserat på state.view.
  function render() {
    if (state.view === 'login') return renderLogin();
    if (state.view === 'home') return renderHome();
    return renderCalc();
  }

  // --- Login-vy (split editorial) ---
  function renderLogin() {
    const root = document.getElementById('app');
    const err = uiState.loginError;
    root.innerHTML = `
      <div class="login-split">
        <div class="login-brand">
          <div class="brand-watermark"></div>
          <img class="brand-logo" src="assets/byggbiten-logga.svg" alt="Byggbiten i Norrland">
          <div class="brand-hero">
            <div class="brand-eyebrow">För HSB Sundsvall</div>
            <h1 class="brand-title">Renoverings&shy;kalkyl för bostadsrätten &mdash; på 30 sekunder.</h1>
            <p class="brand-lead">
              Ett verktyg från Byggbiten i Norrland AB. Räkna ut överslag för renovering av lägenheten innan ni begär offert — lägg till rum, välj material, skriv ut som PDF.
            </p>
          </div>
          <div class="brand-footer">
            <span>Byggbiten i Norrland AB</span>
            <span>Renoveringskalkyl 1.0</span>
          </div>
        </div>
        <div class="login-form-panel">
          <form class="login-form-inner" onsubmit="return false">
            <h2 class="login-form-title">Logga in</h2>
            <p class="login-form-subtitle">Demo-användare: <strong>demo</strong> / <strong>demo</strong></p>
            <div class="login-field">
              <label class="login-label" for="login-user">Användarnamn</label>
              <input class="login-input" id="login-user" name="user" type="text" placeholder="demo" autocomplete="username" autofocus>
            </div>
            <div class="login-field">
              <label class="login-label" for="login-pw">Lösenord</label>
              <input class="login-input" id="login-pw" name="pw" type="password" placeholder="demo" autocomplete="current-password">
            </div>
            ${err ? `<div class="login-error">${escapeHtml(err)}</div>` : ''}
            <button class="login-btn" type="submit" data-action="submit-login">Logga in</button>
            <p class="login-help">Problem att logga in? <a href="mailto:kontakt@byggbiten.nu">Kontakta Byggbiten</a></p>
          </form>
        </div>
      </div>
    `;
    setTimeout(() => {
      const userInput = document.getElementById('login-user');
      if (userInput) userInput.focus();
    }, 50);
  }

  // --- Hemvy (mörk header + 2 val-cards + projekt-lista) ---
  function renderHome() {
    const root = document.getElementById('app');
    const hasProjects = state.savedProjects && state.savedProjects.length > 0;
    const userLabel = state.auth && state.auth.user ? 'HSB Sundsvall' : '';

    const projectsHtml = hasProjects
      ? state.savedProjects
          .slice()
          .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
          .map(renderProjectRow)
          .join('')
      : `<div class="home-empty">
          <p class="home-empty-title">Inga sparade kalkyler än</p>
          <p class="home-empty-body">Starta en ny kalkyl så dyker den upp här när du sparar den.</p>
        </div>`;

    root.innerHTML = `
      <div class="home-view is-active">
        <div class="home-shell">
          <div class="home-header">
            <img class="home-header-logo" src="assets/byggbiten-logga.svg" alt="Byggbiten">
            <div class="home-user">
              <div>
                <div class="home-user-name">${escapeHtml(userLabel)}</div>
                <div class="home-user-role">Förvaltare</div>
              </div>
              <button class="logout-btn" type="button" data-action="logout">Logga ut</button>
            </div>
          </div>

          <div class="home-hero">
            <div class="home-hero-eyebrow">Välkommen tillbaka</div>
            <h2 class="home-hero-title">Vad vill du göra idag?</h2>
          </div>

          <div class="home-actions">
            <button class="action-card primary" type="button" data-action="new-calc">
              <div class="action-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              </div>
              <div class="action-title">Ny kalkyl</div>
              <div class="action-desc">Starta en tom kalkyl för en lägenhet från början.</div>
              <div class="action-arrow">Starta <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
            </button>
            <button class="action-card" type="button" ${hasProjects ? 'data-action="focus-projects"' : 'disabled'}>
              <div class="action-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>
              </div>
              <div class="action-title">Återuppta kalkyl</div>
              <div class="action-desc">${hasProjects ? 'Fortsätt på en sparad kalkyl från listan nedan.' : 'Du har inga sparade kalkyler än.'}</div>
              <div class="action-arrow">Öppna <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></div>
            </button>
          </div>

          <div class="home-section-title" id="home-projects-anchor">Senast sparade kalkyler</div>
          <div class="projects-list">
            ${projectsHtml}
          </div>
        </div>
      </div>
    `;
  }

  function renderProjectRow(p) {
    const rumCount = (p.rum || []).length;
    const calcTotal = (p.rum || []).reduce((sum, rum) => sum + window.APP_DATA.calcRoomSubtotal(rum), 0);
    const label = (p.projektNamn && p.projektNamn.trim()) || 'Namnlös kalkyl';
    const dateStr = p.updatedAt ? formatRelativeDate(p.updatedAt) : (p.datum || '');
    const renaming = uiState.renamingProjectId === p.id;

    const nameBlock = renaming
      ? `<input class="project-name-input" type="text" value="${escapeHtml(p.projektNamn || '')}" placeholder="Namnlös kalkyl" data-project-id="${escapeHtml(p.id)}" data-role="project-rename" aria-label="Byt projektnamn">`
      : `<div class="project-name">${escapeHtml(label)}</div>`;

    return `
      <div class="project-row${renaming ? ' is-renaming' : ''}" data-action="load-project" data-project-id="${escapeHtml(p.id)}" role="button" tabindex="0">
        <div class="project-main">
          <div class="project-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>
          </div>
          <div class="project-info">
            ${nameBlock}
            <div class="project-meta">${escapeHtml(dateStr)} · ${rumCount} rum</div>
          </div>
        </div>
        <div class="project-right-group">
          <div class="project-total-block">
            <div class="project-total">${formatKr(calcTotal)}</div>
            <div class="project-total-meta">Ex. moms</div>
          </div>
          <div class="project-actions">
            <button class="project-action-btn" type="button" data-action="rename-project" data-project-id="${escapeHtml(p.id)}" title="Byt namn" aria-label="Byt namn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
            </button>
            <button class="project-action-btn project-action-btn--danger" type="button" data-action="delete-project" data-project-id="${escapeHtml(p.id)}" title="Ta bort" aria-label="Ta bort">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function formatRelativeDate(isoOrTs) {
    try {
      const d = new Date(isoOrTs);
      if (isNaN(d)) return String(isoOrTs).substring(0, 10);
      const now = new Date();
      const diffMs = now - d;
      const diffH = diffMs / (1000 * 60 * 60);
      if (diffH < 1) return 'Senast ändrad nyss';
      if (diffH < 24) return 'Senast ändrad idag';
      const diffD = Math.floor(diffH / 24);
      if (diffD === 1) return 'Senast ändrad igår';
      if (diffD < 7) return `Senast ändrad för ${diffD} dagar sedan`;
      const pad = (n) => String(n).padStart(2, '0');
      return `Senast ändrad ${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } catch (e) { return ''; }
  }

  function renderCalc() {
    const root = document.getElementById('app');
    const hasRooms = state.rum.length > 0;

    root.innerHTML = `
      <div class="app-shell">
        <aside class="sidebar">
          ${renderSidebar()}
          ${renderSidebarActions()}
        </aside>
        <main class="app-main">
          <div class="app-inner">
            <div class="header-card">
              ${renderHeader()}
              <span class="header-divider" role="presentation"></span>
              ${renderMeta()}
            </div>
            ${renderAddRoom()}
            ${hasRooms ? state.rum.map(renderRoom).join('') : renderEmptyState()}
            ${hasRooms ? renderTotal() : ''}
          </div>
        </main>
      </div>
      ${renderAddRoomModal()}
    `;
    // Stagger-applied entry-animation på alla rum vid bootstrap.
    if (hasRooms) {
      root.querySelectorAll('.room').forEach((el, idx) => animateEntry(el, idx * 100));
      animateTotalCount();
      setupScrollSpy();
    }
  }

  // --- Number tween (animerar siffror upp/ner vid förändring) ---

  const PREFERS_REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');

  function parseAmount(el) {
    const match = (el.textContent || '').replace(/\s|\u00A0/g, '').match(/-?\d+/);
    return match ? parseInt(match[0], 10) : 0;
  }

  // Animerar textContent från aktuellt värde till nytt värde. Korta, snabba tweens (default 280ms).
  // Avbryter pågående tween på samma element så snabba klick inte stör varandra.
  function tweenNumberTo(el, newValue, duration) {
    if (!el) return;
    const d = typeof duration === 'number' ? duration : 280;

    if (el._tweenRAF) { cancelAnimationFrame(el._tweenRAF); el._tweenRAF = null; }

    const from = el._lastTweenValue != null ? el._lastTweenValue : parseAmount(el);

    if (from === newValue) {
      el.textContent = formatKr(newValue);
      el._lastTweenValue = newValue;
      return;
    }

    if (PREFERS_REDUCED_MOTION.matches) {
      el.textContent = formatKr(newValue);
      el._lastTweenValue = newValue;
      return;
    }

    const start = performance.now();
    const delta = newValue - from;
    const easeOutExpo = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    function tick(now) {
      const p = Math.min(1, (now - start) / d);
      const value = Math.round(from + delta * easeOutExpo(p));
      el.textContent = formatKr(value);
      if (p < 1) {
        el._tweenRAF = requestAnimationFrame(tick);
      } else {
        el._lastTweenValue = newValue;
        el._tweenRAF = null;
      }
    }
    el._tweenRAF = requestAnimationFrame(tick);
  }

  // Diskret puls på siffror som förstärker att de precis ändrats.
  function pulseNumber(el) {
    if (!el || PREFERS_REDUCED_MOTION.matches) return;
    if (!el.animate) return;
    // Avbryt ev. pågående puls.
    try { el.getAnimations().forEach((a) => { if (a._pulse) a.cancel(); }); } catch (e) { /* ignore */ }
    const anim = el.animate([
      { transform: 'scale(1)' },
      { transform: 'scale(1.045)', offset: 0.3 },
      { transform: 'scale(1)' }
    ], { duration: 380, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' });
    anim._pulse = true;
  }

  // --- Granulära DOM-uppdateringar (undviker full re-render och "flimmer") ---

  function itemElFor(rumId, itemId) {
    return document.querySelector(
      `.room[data-room-id="${CSS.escape(rumId)}"] .item[data-item-id="${CSS.escape(itemId)}"]`
    );
  }

  // Uppdaterar en enskild item-rad in-place: checkbox-klass, disabled-klass, pris, antal-input.
  // Ingen re-render, ingen entry-animation. Checkbox-bounce triggas bara när .checked läggs till.
  function updateItemDOM(rum, itemId) {
    const itemEl = itemElFor(rum.id, itemId);
    if (!itemEl) return;
    const item = findItem(rum.typ, itemId);
    if (!item) return;
    const valt = rum.valda[itemId];
    const checked = !!(valt && valt.checked);
    const disabled = !checked && isItemDisabled(item, rum);

    const cb = itemEl.querySelector('.checkbox');
    if (cb) cb.classList.toggle('checked', checked);

    itemEl.classList.toggle('disabled', disabled);

    if (item.hasCount) {
      const countInput = itemEl.querySelector('.item-count');
      // Rör inte värdet om användaren just skriver i fältet.
      if (countInput && document.activeElement !== countInput) {
        countInput.value = String((valt && valt.count) || 0);
      }
    } else if (item.hasArea) {
      const areaInput = itemEl.querySelector('.item-count');
      if (areaInput && document.activeElement !== areaInput) {
        areaInput.value = String((valt && valt.area) || 0);
      }
    }

    const priceEl = itemEl.querySelector('.item-price');
    if (priceEl) {
      const displayPrice = checked ? calcItemTotal(item, valt, rum) : getDisplayPrice(item, rum);
      tweenNumberTo(priceEl, displayPrice, 240);
    }
  }

  function updateAllItemsInRoomDOM(rum) {
    const rt = ROOM_TYPES[rum.typ];
    if (!rt) return;
    rt.items.forEach((item) => updateItemDOM(rum, item.id));
  }

  function updateSubtotalDOM(rum) {
    const roomEl = document.querySelector(`.room[data-room-id="${CSS.escape(rum.id)}"]`);
    if (!roomEl) return;
    const subtotalEl = roomEl.querySelector('.subtotal-value');
    if (!subtotalEl) return;
    const newVal = calcRoomSubtotal(rum);
    const oldVal = subtotalEl._lastTweenValue != null ? subtotalEl._lastTweenValue : parseAmount(subtotalEl);
    tweenNumberTo(subtotalEl, newVal, 300);
    if (newVal !== oldVal) pulseNumber(subtotalEl);
  }

  function updateTotalDOM() {
    const total = calcTotal(state);
    const totalEl = document.querySelector('.total-amount');
    if (totalEl) {
      totalEl.setAttribute('data-total', String(total));
      const oldVal = totalEl._lastTweenValue != null ? totalEl._lastTweenValue : parseAmount(totalEl);
      tweenNumberTo(totalEl, total, 380);
      if (total !== oldVal) pulseNumber(totalEl);
    }
    const roomsEl = document.querySelector('.total-rooms');
    if (roomsEl) {
      const antalRum = state.rum.length;
      const names = state.rum
        .map((r) => ROOM_TYPES[r.typ] && ROOM_TYPES[r.typ].displayName.toLowerCase())
        .filter(Boolean)
        .join(', ');
      roomsEl.textContent = `${antalRum} rum${names ? ' · ' + names : ''}`;
    }
  }

  function appendRoomDOM(rum) {
    const appInner = document.querySelector('.app-inner');
    if (!appInner) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = renderRoom(rum);
    const roomEl = wrap.firstElementChild;
    animateEntry(roomEl);
    const totalWrap = appInner.querySelector('.total-wrap');
    if (totalWrap) appInner.insertBefore(roomEl, totalWrap);
    else appInner.appendChild(roomEl);
  }

  // Kör entry-animation via `.entering`-klass. Tas bort efter slut så klass-toggles
  // senare (t.ex. under drag) inte retriggar animationen.
  function animateEntry(el, delay) {
    if (!el) return;
    el.classList.add('entering');
    if (delay) el.style.animationDelay = delay + 'ms';
    const cleanup = () => {
      el.classList.remove('entering');
      el.style.animationDelay = '';
    };
    setTimeout(cleanup, 750 + (delay || 0));
  }

  function removeRoomDOM(rumId, onDone) {
    const roomEl = document.querySelector(`.room[data-room-id="${CSS.escape(rumId)}"]`);
    if (!roomEl) { if (onDone) onDone(); return; }
    const h = roomEl.offsetHeight;
    roomEl.style.maxHeight = h + 'px';
    roomEl.style.overflow = 'hidden';
    void roomEl.offsetHeight; // force reflow
    roomEl.style.transition = 'opacity 260ms ease, transform 260ms ease, max-height 300ms ease, margin 300ms ease, padding 300ms ease, border-width 300ms ease';
    roomEl.style.opacity = '0';
    roomEl.style.transform = 'translateX(-14px)';
    roomEl.style.maxHeight = '0';
    roomEl.style.marginBottom = '0';
    roomEl.style.paddingTop = '0';
    roomEl.style.paddingBottom = '0';
    roomEl.style.borderWidth = '0';
    setTimeout(() => { roomEl.remove(); if (onDone) onDone(); }, 320);
  }

  function switchFilledToEmptyDOM() {
    const appInner = document.querySelector('.app-inner');
    if (!appInner) return;
    const totalWrap = appInner.querySelector('.total-wrap');
    if (totalWrap) totalWrap.remove();
    const existing = appInner.querySelector('.empty-state');
    if (existing) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = renderEmptyState();
    const emptyEl = wrap.firstElementChild;
    const addRoom = appInner.querySelector('.add-room');
    if (addRoom) addRoom.after(emptyEl);
    else appInner.appendChild(emptyEl);
  }

  function switchEmptyToFilledDOM(rum) {
    const appInner = document.querySelector('.app-inner');
    if (!appInner) return;
    const emptyEl = appInner.querySelector('.empty-state');
    if (emptyEl) emptyEl.remove();
    appendRoomDOM(rum);
    if (!appInner.querySelector('.total-wrap')) {
      const wrap = document.createElement('div');
      wrap.innerHTML = renderTotal();
      appInner.appendChild(wrap.firstElementChild);
    }
    updateTotalDOM();
  }

  function openModalDOM() {
    uiState.modalOpen = true;
    if (document.querySelector('.modal-backdrop')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = renderAddRoomModal();
    const modal = wrap.firstElementChild;
    document.body.appendChild(modal);
  }

  function closeModalDOM() {
    uiState.modalOpen = false;
    const modal = document.querySelector('.modal-backdrop');
    if (modal) modal.remove();
  }

  // Count-up-animation på totalsumman vid bootstrap (första render).
  // Delegerar till tweenNumberTo så senare klick-animationer kan avbryta denna vid behov.
  function animateTotalCount() {
    const el = document.querySelector('.total-amount');
    if (!el) return;
    const target = Number(el.getAttribute('data-total')) || 0;
    if (PREFERS_REDUCED_MOTION.matches || target <= 0) {
      el.textContent = formatKr(target);
      el._lastTweenValue = target;
      return;
    }
    // Starta från 0 så räkningen blir tydlig.
    el.textContent = formatKr(0);
    el._lastTweenValue = 0;
    setTimeout(() => tweenNumberTo(el, target, 1200), 780);
  }

  // --- Stepper-knappar (upp/ner på golvyta och takhöjd) ---

  const stepHold = { timer: null, interval: null };

  function clearStepHold() {
    if (stepHold.timer) clearTimeout(stepHold.timer);
    if (stepHold.interval) clearInterval(stepHold.interval);
    stepHold.timer = null;
    stepHold.interval = null;
  }

  function onStepperPointerDown(e) {
    const btn = e.target.closest('.stepper-up, .stepper-down');
    if (!btn) return;
    e.preventDefault();

    function doStep() {
      const stepper = btn.closest('.stepper');
      if (!stepper) return;
      const step = parseFloat(stepper.dataset.step) || 1;
      const container = stepper.closest('.room-area, .room-takhojd, .item-count-wrap');
      if (!container) return;
      const input = container.querySelector('input');
      if (!input) return;
      const current = parseFloat(String(input.value).replace(',', '.'));
      const base = Number.isFinite(current) ? current : 0;
      const delta = btn.classList.contains('stepper-up') ? step : -step;
      let next = base + delta;
      // Runda av för att undvika floating-point-spill (t.ex. 2.4 + 0.1 = 2.4999999).
      if (step < 1) next = Math.round(next * 10) / 10;
      else next = Math.round(next);
      if (next < 0) next = 0;
      input.value = step < 1 ? String(next).replace('.', ',') : String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    doStep();
    // Press-and-hold: efter 360ms börja repeat varje 90ms.
    stepHold.timer = setTimeout(() => {
      stepHold.interval = setInterval(doStep, 90);
    }, 360);

    const stop = () => {
      clearStepHold();
      document.removeEventListener('pointerup', stop);
      document.removeEventListener('pointercancel', stop);
      document.removeEventListener('pointerleave', stop);
    };
    document.addEventListener('pointerup', stop);
    document.addEventListener('pointercancel', stop);
  }

  // --- Drag and drop för rumsordning ---
  // Använder FLIP (First-Last-Invert-Play) för att animera syskon till nya positioner
  // när en crossover sker. Draggat element följer cursorn via translateY.

  const drag = {
    mode: 'idle', // 'idle' | 'pending' | 'active'
    roomEl: null,
    startY: 0,
    pointerId: null
  };

  function onDragHandlePointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const handle = e.target.closest('.room-drag-handle');
    if (!handle) return;
    const roomEl = handle.closest('.room');
    if (!roomEl) return;
    e.preventDefault();

    drag.mode = 'pending';
    drag.roomEl = roomEl;
    drag.startY = e.clientY;
    drag.pointerId = e.pointerId;

    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    document.addEventListener('pointermove', onDragPointerMove);
    document.addEventListener('pointerup', onDragPointerUp);
    document.addEventListener('pointercancel', onDragPointerUp);
  }

  function onDragPointerMove(e) {
    if (drag.mode === 'idle') return;

    if (drag.mode === 'pending') {
      const delta = Math.abs(e.clientY - drag.startY);
      if (delta < 5) return;
      drag.mode = 'active';
      drag.roomEl.classList.add('dragging');
      drag.roomEl.style.zIndex = '10';
      // Stäng av transition på draget element så transform följer cursorn direkt (ingen lerp).
      drag.roomEl.style.transition = 'box-shadow 200ms ease, border-color 200ms ease';
      document.body.classList.add('is-dragging');
    }

    const dy = e.clientY - drag.startY;
    drag.roomEl.style.transform = `translateY(${dy}px) scale(1.015)`;

    // Detektera crossover
    const draggedRect = drag.roomEl.getBoundingClientRect();
    const draggedMid = draggedRect.top + draggedRect.height / 2;
    const container = drag.roomEl.parentNode;
    const allRooms = Array.from(container.querySelectorAll('.room'));
    const draggedIdx = allRooms.indexOf(drag.roomEl);

    for (let i = 0; i < allRooms.length; i++) {
      if (i === draggedIdx) continue;
      const sib = allRooms[i];
      const sibRect = sib.getBoundingClientRect();
      const sibMid = sibRect.top + sibRect.height / 2;

      if (i < draggedIdx && draggedMid < sibMid) {
        performSwap(sib, 'before', e);
        return;
      }
      if (i > draggedIdx && draggedMid > sibMid) {
        performSwap(sib, 'after', e);
        return;
      }
    }
  }

  function performSwap(sibling, position, e) {
    const container = drag.roomEl.parentNode;
    const allRooms = Array.from(container.querySelectorAll('.room'));

    // FLIP First: snapshot positions
    const oldRects = new Map();
    allRooms.forEach((r) => oldRects.set(r, r.getBoundingClientRect()));

    // Reorder DOM
    if (position === 'before') sibling.before(drag.roomEl);
    else sibling.after(drag.roomEl);

    // Reorder state
    const dragId = drag.roomEl.dataset.roomId;
    const sibId = sibling.dataset.roomId;
    const dragIdx = state.rum.findIndex((r) => r.id === dragId);
    const [dragRum] = state.rum.splice(dragIdx, 1);
    const sibIdxNew = state.rum.findIndex((r) => r.id === sibId);
    state.rum.splice(position === 'before' ? sibIdxNew : sibIdxNew + 1, 0, dragRum);

    // Sidebar ordning speglar rum-ordning — uppdatera efter swap.
    updateSidebarDOM();
    persistState();

    // Justera draggedEl så den visuellt stannar kvar där cursorn är trots DOM-flytt.
    const oldDragR = oldRects.get(drag.roomEl);
    const newDragR = drag.roomEl.getBoundingClientRect();
    const layoutDy = newDragR.top - oldDragR.top;
    drag.startY += layoutDy;
    const newDy = e.clientY - drag.startY;
    drag.roomEl.style.transform = `translateY(${newDy}px) scale(1.015)`;

    // FLIP Invert + Play för övriga rum
    allRooms.forEach((room) => {
      if (room === drag.roomEl) return;
      const oldR = oldRects.get(room);
      const newR = room.getBoundingClientRect();
      const deltaY = oldR.top - newR.top;
      if (Math.abs(deltaY) < 0.5) return;
      room.style.transition = 'none';
      room.style.transform = `translateY(${deltaY}px)`;
      requestAnimationFrame(() => {
        room.style.transition = 'transform 280ms cubic-bezier(0.4, 0, 0.2, 1)';
        room.style.transform = '';
        setTimeout(() => {
          if (!drag.active || room !== drag.roomEl) room.style.transition = '';
        }, 300);
      });
    });
  }

  function onDragPointerUp() {
    if (drag.mode === 'idle') return;
    document.removeEventListener('pointermove', onDragPointerMove);
    document.removeEventListener('pointerup', onDragPointerUp);
    document.removeEventListener('pointercancel', onDragPointerUp);

    const wasActive = drag.mode === 'active';
    const el = drag.roomEl;
    drag.mode = 'idle';
    drag.roomEl = null;

    if (!wasActive || !el) return;

    el.style.transition = 'transform 320ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 220ms ease';
    el.style.transform = '';
    setTimeout(() => {
      el.classList.remove('dragging');
      el.style.zIndex = '';
      el.style.transition = '';
      document.body.classList.remove('is-dragging');
    }, 330);
  }

  // --- Event handlers ---

  function onClick(e) {
    // Sidebar nav → smooth-scrolla till rummet + kort markering + sätt active direkt.
    const navBtn = e.target.closest('[data-nav-target]');
    if (navBtn) {
      const rumId = navBtn.dataset.navTarget;
      document.querySelectorAll('.sidebar-item').forEach((el) => {
        el.classList.toggle('active', el.dataset.navTarget === rumId);
      });
      const roomEl = document.querySelector(`.room[data-room-id="${CSS.escape(rumId)}"]`);
      if (roomEl) {
        roomEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        roomEl.classList.add('is-nav-highlight');
        setTimeout(() => roomEl.classList.remove('is-nav-highlight'), 1200);
      }
      return;
    }

    const action = e.target.closest('[data-action]');
    if (!action) return;
    const actionName = action.dataset.action;

    if (actionName === 'toggle-item') {
      const itemId = action.dataset.itemId;
      const roomEl = action.closest('.room');
      if (!roomEl) return;
      const rum = findRoom(roomEl.dataset.roomId);
      if (!rum) return;
      toggleItem(rum, itemId);
      // Följeposter kan ha tillkommit/försvunnit — re-rendera rummets body.
      rerenderRoomBodyDOM(rum);
      updateSubtotalDOM(rum);
      updateTotalDOM();
      persistState();
      return;
    }

    if (actionName === 'toggle-followup') {
      const fuId = action.dataset.followupId;
      const roomEl = action.closest('.room');
      if (!roomEl) return;
      const rum = findRoom(roomEl.dataset.roomId);
      if (!rum) return;
      toggleFollowup(rum, fuId);
      rerenderRoomBodyDOM(rum);
      updateSubtotalDOM(rum);
      updateTotalDOM();
      persistState();
      return;
    }

    // Del III (2026-04-22): expand/collapse item-detaljer. Egen data-action,
    // alltid fångad före toggle-item via action-namnet → ingen stopPropagation behövs.
    if (actionName === 'toggle-item-details') {
      const itemId = action.dataset.itemId;
      const roomEl = action.closest('.room');
      if (!roomEl || !itemId) return;
      const rum = findRoom(roomEl.dataset.roomId);
      if (!rum) return;
      if (state.expandedItems.has(itemId)) state.expandedItems.delete(itemId);
      else state.expandedItems.add(itemId);
      rerenderRoomBodyDOM(rum);
      // Ingen persist — expanded-state är session-bundet.
      return;
    }

    if (actionName === 'remove-room') {
      const roomEl = action.closest('.room');
      if (!roomEl) return;
      const rumId = roomEl.dataset.roomId;
      const rum = findRoom(rumId);
      if (!rum) return;
      const rt = ROOM_TYPES[rum.typ];
      const namn = rt ? rt.displayName.toLowerCase() : 'rummet';
      if (window.confirm(`Ta bort ${namn}?`)) {
        removeRoomDOM(rumId, () => {
          state.rum = state.rum.filter((r) => r.id !== rumId);
          if (state.rum.length === 0) switchFilledToEmptyDOM();
          else updateTotalDOM();
          updateSidebarDOM();
          persistState();
        });
      }
      return;
    }

    if (actionName === 'open-add-room') {
      openModalDOM();
      return;
    }

    if (actionName === 'close-modal') {
      // Stäng bara om klick direkt på backdrop (inte på innehåll) eller på close-knapp.
      if (action.classList.contains('modal-backdrop') && e.target !== action) return;
      closeModalDOM();
      return;
    }

    if (actionName === 'add-room') {
      const type = action.dataset.type;
      if (!type || !ROOM_TYPES[type]) return;
      const wasEmpty = state.rum.length === 0;
      const newRum = {
        id: nextRoomId(),
        typ: type,
        yta: ROOM_TYPES[type].defaultArea,
        takhojd: DEFAULT_CEILING_HEIGHT,
        valda: {}
      };
      // Rumstyp-defaults vid skapande (2026-04-22 — flyttat från hårdkodat if/else-stege
      // till deklarativ ROOM_TYPES[typ].defaultOnCreate + runtime perRoom-skalning).
      const rtForDefaults = ROOM_TYPES[type];
      if (rtForDefaults) {
        // 1. Statiska defaults från data.js.
        if (rtForDefaults.defaultOnCreate) {
          for (const [itemId, def] of Object.entries(rtForDefaults.defaultOnCreate)) {
            newRum.valda[itemId] = { ...def };
          }
        }
        // 2. Runtime perRoom-skalning för items med `perRoom` (endast Övrigt idag).
        //    Skalas med antal befintliga rum av andra typer. checked:true eftersom det är
        //    en hjälpsam pre-fill (kan justeras/avkryssas av användaren).
        const rumExkl = state.rum.filter((r) => r.typ !== type).length;
        if (rumExkl > 0) {
          for (const item of rtForDefaults.items) {
            if (item.perRoom && item.hasCount) {
              newRum.valda[item.id] = { checked: true, count: item.perRoom * rumExkl };
            }
          }
        }
      }
      // Initiera följeposter (defaults) för det nya rummet innan rendering.
      window.APP_DATA.syncFollowups(newRum);
      state.rum.push(newRum);
      closeModalDOM();
      if (wasEmpty) {
        switchEmptyToFilledDOM(newRum);
      } else {
        appendRoomDOM(newRum);
        updateTotalDOM();
      }
      updateSidebarDOM();
      persistState();
      return;
    }

    if (actionName === 'print') {
      triggerPrint();
      return;
    }

    if (actionName === 'request-quote') {
      openOffertModal();
      return;
    }

    // --- Del II (2026-04-22): offert-modal-handlers ---
    if (actionName === 'close-offert-modal') {
      if (action.classList.contains('modal-backdrop') && e.target !== action) return;
      closeOffertModal();
      return;
    }
    if (actionName === 'offert-save-pdf') {
      triggerPrint();
      uiState.offertPdfSaved = true;
      // Vänta tills print-dialogen stängts (efterhand user sparar) innan vi re-renderar
      // modalen. Använd timeout som heuristik; i de flesta fall har dialogen stängts
      // inom ~500 ms efter tryck.
      setTimeout(rerenderOffertModal, 700);
      return;
    }
    if (actionName === 'offert-open-native') {
      const { subject, body } = buildOffertMailFields();
      const url = 'mailto:' + OFFERT_RECIPIENT + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      window.open(url, '_blank');
      flashBanner('Om mejlappen inte öppnas automatiskt, använd Gmail eller Outlook istället.');
      return;
    }
    if (actionName === 'offert-open-gmail') {
      const { subject, body } = buildOffertMailFields();
      const url = 'https://mail.google.com/mail/?view=cm&fs=1&to=' + encodeURIComponent(OFFERT_RECIPIENT) +
        '&su=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      window.open(url, '_blank');
      return;
    }
    if (actionName === 'offert-open-outlook') {
      const { subject, body } = buildOffertMailFields();
      const url = 'https://outlook.office.com/mail/deeplink/compose?to=' + encodeURIComponent(OFFERT_RECIPIENT) +
        '&subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      window.open(url, '_blank');
      return;
    }

    if (actionName === 'save-calc') {
      saveCurrentCalc();
      return;
    }

    if (actionName === 'go-home') {
      state.view = 'home';
      state.expandedItems.clear();  // Del III: rensa expand-state vid vyväxling
      persistState();
      render();
      return;
    }

    if (actionName === 'submit-login') {
      e.preventDefault();
      const form = document.querySelector('.login-form-inner');
      if (!form) return;
      const user = form.querySelector('input[name="user"]').value;
      const pw = form.querySelector('input[name="pw"]').value;
      attemptLogin(user, pw);
      return;
    }

    if (actionName === 'logout') {
      state.auth = { loggedIn: false, user: null };
      state.view = 'login';
      uiState.loginError = null;
      persistState();
      render();
      return;
    }

    if (actionName === 'new-calc') {
      Object.assign(state, emptyCalc());
      state.currentProjectId = null;
      state.view = 'calc';
      state.expandedItems.clear();  // Del III: ny kalkyl → rensa expand-state
      persistState();
      render();
      return;
    }

    if (actionName === 'focus-projects') {
      const anchor = document.getElementById('home-projects-anchor');
      if (anchor) anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    if (actionName === 'load-project') {
      const id = action.dataset.projectId;
      loadProject(id);
      return;
    }

    if (actionName === 'rename-project') {
      e.stopPropagation();
      const id = action.dataset.projectId;
      uiState.renamingProjectId = id;
      render();
      // Fokusera input + selectera all text
      setTimeout(() => {
        const inp = document.querySelector(`input[data-role="project-rename"][data-project-id="${CSS.escape(id)}"]`);
        if (inp) { inp.focus(); inp.select(); }
      }, 30);
      return;
    }

    if (actionName === 'delete-project') {
      e.stopPropagation();
      const id = action.dataset.projectId;
      const proj = (state.savedProjects || []).find((p) => p.id === id);
      const label = (proj && proj.projektNamn && proj.projektNamn.trim()) || 'denna kalkyl';
      if (window.confirm(`Ta bort ${label}?`)) {
        deleteProject(id);
      }
      return;
    }
  }

  // --- Login-actions ---
  function attemptLogin(user, pw) {
    const okUser = (user || '').trim().toLowerCase() === AUTH_USER;
    const okPw = pw === AUTH_PASSWORD;
    if (!okUser || !okPw) {
      uiState.loginError = 'Felaktigt användarnamn eller lösenord.';
      render();
      return false;
    }
    state.auth = { loggedIn: true, user: AUTH_USER };
    uiState.loginError = null;
    state.view = 'home';
    persistState();
    render();
    return true;
  }

  // --- Hemvy-actions ---
  function saveCurrentCalc() {
    const now = new Date().toISOString();
    const id = state.currentProjectId || genProjectId();
    const snapshot = {
      id,
      projektNamn: state.projektNamn || '',
      datum: state.datum,
      rum: JSON.parse(JSON.stringify(state.rum || [])),
      updatedAt: now
    };
    state.savedProjects = state.savedProjects || [];
    const idx = state.savedProjects.findIndex((p) => p.id === id);
    if (idx >= 0) state.savedProjects[idx] = snapshot;
    else state.savedProjects.push(snapshot);
    state.currentProjectId = id;
    persistState();
    flashBanner('Kalkyl sparad');
  }

  function loadProject(id) {
    const p = (state.savedProjects || []).find((x) => x.id === id);
    if (!p) return;
    state.projektNamn = p.projektNamn || '';
    state.datum = p.datum || window.APP_DATA.todayIso();
    state.rum = JSON.parse(JSON.stringify(p.rum || []));
    // Graceful upgrade — fyll på följepost-defaults om kalkylen är sparad före 2026-04-21.
    state.rum.forEach((rum) => window.APP_DATA.syncFollowups(rum));
    state.currentProjectId = p.id;
    state.view = 'calc';
    persistState();
    render();
  }

  function deleteProject(id) {
    state.savedProjects = (state.savedProjects || []).filter((p) => p.id !== id);
    // Om det var den aktiva kalkyleringen — nollställ pekaren men behåll data i calc.
    if (state.currentProjectId === id) state.currentProjectId = null;
    if (uiState.renamingProjectId === id) uiState.renamingProjectId = null;
    persistState();
    render();
    flashBanner('Kalkyl borttagen');
  }

  function renameProjectCommit(id, newName) {
    const trimmed = (newName || '').trim();
    const proj = (state.savedProjects || []).find((p) => p.id === id);
    if (proj) {
      proj.projektNamn = trimmed;
      proj.updatedAt = new Date().toISOString();
      // Håll aktiv calc-state i synk om det är samma kalkyl.
      if (state.currentProjectId === id) {
        state.projektNamn = trimmed;
      }
    }
    uiState.renamingProjectId = null;
    persistState();
    render();
  }

  function renameProjectCancel() {
    uiState.renamingProjectId = null;
    render();
  }

  // Enkel flash-banner längst upp; används för spara-feedback.
  function flashBanner(msg) {
    const existing = document.getElementById('flash-banner');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.id = 'flash-banner';
    el.className = 'flash-banner';
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 320); }, 1800);
  }

  function onInput(e) {
    const target = e.target;

    // Projektnamn
    if (target.matches('.project-field')) {
      state.projektNamn = target.value;
      persistState();
      return;
    }

    // Rumsnamn (eget) — visar/dölj subtitel "Kategori X" live + uppdatera sidebar.
    if (target.matches('.room-name-input')) {
      const roomEl = target.closest('.room');
      if (!roomEl) return;
      const rum = findRoom(roomEl.dataset.roomId);
      if (!rum) return;
      rum.namn = target.value;
      const subtitleEl = roomEl.querySelector('.room-name-subtitle');
      if (subtitleEl) {
        if (rum.namn.trim()) subtitleEl.removeAttribute('hidden');
        else subtitleEl.setAttribute('hidden', '');
      }
      // Uppdatera motsvarande sidebar-item-name utan full re-render av sidebar.
      const sidebarItem = document.querySelector(`.sidebar-item[data-nav-target="${CSS.escape(rum.id)}"]`);
      if (sidebarItem) {
        const rt = ROOM_TYPES[rum.typ];
        const nameEl = sidebarItem.querySelector('.sidebar-item-name');
        const metaEl = sidebarItem.querySelector('.sidebar-item-meta');
        const displayName = (rum.namn && rum.namn.trim()) || rt.displayName;
        if (nameEl) nameEl.textContent = displayName;
        if (metaEl && rt) {
          const parts = [];
          if (!rt.hideArea && rum.yta > 0) parts.push(rum.yta + ' m²');
          if (rum.namn && rum.namn.trim()) parts.push(rt.displayName.toLowerCase());
          metaEl.textContent = parts.join(' · ');
        }
      }
      persistState();
      return;
    }

    // Rumsyta
    if (target.matches('.room-area input')) {
      const roomEl = target.closest('.room');
      if (!roomEl) return;
      const rum = findRoom(roomEl.dataset.roomId);
      if (!rum) return;
      const val = parseFloat(target.value.replace(',', '.'));
      rum.yta = Number.isFinite(val) && val > 0 ? val : 0;
      updateAllItemsInRoomDOM(rum);
      updateSubtotalDOM(rum);
      updateTotalDOM();
      persistState();
      return;
    }

    // Takhöjd (påverkar wallCalc-items)
    if (target.matches('.room-takhojd input')) {
      const roomEl = target.closest('.room');
      if (!roomEl) return;
      const rum = findRoom(roomEl.dataset.roomId);
      if (!rum) return;
      const val = parseFloat(target.value.replace(',', '.'));
      rum.takhojd = Number.isFinite(val) && val > 0 ? val : DEFAULT_CEILING_HEIGHT;
      updateAllItemsInRoomDOM(rum);
      updateSubtotalDOM(rum);
      updateTotalDOM();
      persistState();
      return;
    }

    // Antal per styck-post ELLER m² för area-item (t.ex. klinker i entré)
    if (target.matches('.item-count')) {
      const itemEl = target.closest('.item');
      const roomEl = target.closest('.room');
      if (!itemEl || !roomEl) return;
      const rum = findRoom(roomEl.dataset.roomId);
      if (!rum) return;
      const itemId = itemEl.dataset.itemId;
      if (!rum.valda[itemId]) rum.valda[itemId] = { checked: false };

      if (target.dataset.areaInput === 'true') {
        const n = parseFloat(String(target.value).replace(',', '.'));
        rum.valda[itemId].area = Number.isFinite(n) ? Math.max(0, n) : 0;
        // Klinker (reducesFloor) påverkar andra golvposter — uppdatera hela rummet.
        updateAllItemsInRoomDOM(rum);
      } else {
        const n = parseInt(target.value, 10);
        rum.valda[itemId].count = Number.isFinite(n) ? Math.max(0, Math.min(20, n)) : 0;
        updateItemDOM(rum, itemId);
      }
      updateSubtotalDOM(rum);
      updateTotalDOM();
      persistState();
      return;
    }
  }

  // Normaliserar yta/antal/takhöjd vid blur om värdet är ogiltigt.
  function onBlur(e) {
    const target = e.target;
    if (target.matches('input[data-role="project-rename"]')) {
      // Om rename-inputen fortfarande finns kvar (inte avbruten) — spara namnet.
      if (uiState.renamingProjectId === target.dataset.projectId) {
        renameProjectCommit(target.dataset.projectId, target.value);
      }
      return;
    }
    if (target.matches('.room-area input')) {
      const roomEl = target.closest('.room');
      if (!roomEl) return;
      const rum = findRoom(roomEl.dataset.roomId);
      if (rum) target.value = String(rum.yta);
    } else if (target.matches('.room-takhojd input')) {
      const roomEl = target.closest('.room');
      if (!roomEl) return;
      const rum = findRoom(roomEl.dataset.roomId);
      if (rum) target.value = String(rum.takhojd != null ? rum.takhojd : DEFAULT_CEILING_HEIGHT).replace('.', ',');
    } else if (target.matches('.item-count')) {
      const itemEl = target.closest('.item');
      const roomEl = target.closest('.room');
      if (!itemEl || !roomEl) return;
      const rum = findRoom(roomEl.dataset.roomId);
      if (!rum) return;
      const itemId = itemEl.dataset.itemId;
      const valt = rum.valda[itemId];
      target.value = String((valt && valt.count) || 0);
    }
  }

  // ESC stänger modal / avbryter rename. Enter commit:ar rename.
  function onKeydown(e) {
    if (e.target && e.target.matches && e.target.matches('input[data-role="project-rename"]')) {
      if (e.key === 'Enter') {
        e.preventDefault();
        renameProjectCommit(e.target.dataset.projectId, e.target.value);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        renameProjectCancel();
        return;
      }
    }
    if (e.key === 'Escape' && uiState.modalOpen) {
      uiState.modalOpen = false;
      render();
    }
  }

  // --- State mutations ---

  function toggleItem(rum, itemId) {
    const item = findItem(rum.typ, itemId);
    if (!item) return;
    const valt = rum.valda[itemId] || { checked: false, count: 0 };
    const wasChecked = !!valt.checked;
    const rt = ROOM_TYPES[rum.typ];

    // Om item har group: radio-beteende — uncheck syskon i samma group (inkl. deras följeposter i effekt).
    if (item.group) {
      rt.items.forEach((other) => {
        if (other.id === itemId) return;
        if (other.group === item.group && rum.valda[other.id]) {
          rum.valda[other.id].checked = false;
          // Typ A-följeposter för avkryssad parent räknas inte i summan (checked-state bevaras
          // som preference för ev. framtida återkryssning).
        }
      });
    }

    valt.checked = !wasChecked;

    // Default-antal för hasCount-items vid första check: 1.
    if (item.hasCount && valt.checked && !valt.count) {
      valt.count = 1;
    }
    // Default area för hasArea-items vid första check: item.defaultArea eller 1.
    if (item.hasArea && valt.checked && !valt.area) {
      valt.area = item.defaultArea || 1;
    }

    rum.valda[itemId] = valt;

    // Typ A-följeposter: varje gång parent går till checked, aktivera följeposter
    // enligt defaultChecked (override). Detta matchar promptens krav: "följepost är
    // kryssad som default när huvudposten kryssas". Om användaren tidigare uncheckade
    // följeposten glöms det när parent togglas av och på igen — enkelt och förutsägbart.
    if (valt.checked && !wasChecked && item.followups) {
      for (const fu of item.followups) {
        rum.valda[fu.id] = { checked: !!fu.defaultChecked };
      }
    }

    // Typ B (rums-scope): om denna item är trigger för någon typ B, uppdatera dess state.
    // Regel: när trigger går OFF → ON (första aktivering), auto-kryssa typ B enligt defaultChecked.
    // När trigger går ON → OFF och inga andra triggers är aktiva, uncheck typ B.
    if (rt && rt.roomFollowups) {
      for (const rfu of rt.roomFollowups) {
        if (!(rfu.triggeredBy || []).includes(itemId)) continue;
        const otherTriggersChecked = (rfu.triggeredBy || []).some(
          (tId) => tId !== itemId && rum.valda[tId] && rum.valda[tId].checked
        );
        if (!rum.valda[rfu.id]) rum.valda[rfu.id] = { checked: false };
        if (valt.checked && !otherTriggersChecked) {
          // Första aktivering — auto-aktivera enligt default.
          rum.valda[rfu.id].checked = !!rfu.defaultChecked;
        } else if (!valt.checked && !otherTriggersChecked) {
          // Sista trigger gick av — uncheck typ B (men state bevaras i principal).
          rum.valda[rfu.id].checked = false;
        }
      }
    }
  }

  function toggleFollowup(rum, fuId) {
    const valt = rum.valda[fuId] || { checked: false };
    valt.checked = !valt.checked;
    rum.valda[fuId] = valt;
  }

  // --- Bootstrap ---

  function initialState() {
    const params = new URLSearchParams(window.location.search);
    const stored = loadFromStorage();

    // Devflag: ?empty=1 tvingar tom calc + auto-auth (dev/preview).
    if (params.has('empty')) {
      return Object.assign(
        { view: 'calc', auth: { loggedIn: true, user: AUTH_USER }, savedProjects: [], currentProjectId: null },
        emptyState()
      );
    }
    // Devflag: ?demo=1 laddar demo-calc + auto-auth (dev/preview).
    if (params.has('demo')) {
      return Object.assign(
        { view: 'calc', auth: { loggedIn: true, user: AUTH_USER }, savedProjects: [], currentProjectId: null },
        demoState()
      );
    }

    if (stored && stored.auth && stored.auth.loggedIn) {
      // Återgå till senaste vyn eller hemvy som fallback.
      return {
        view: stored.view || 'home',
        auth: stored.auth,
        savedProjects: stored.savedProjects || [],
        currentProjectId: stored.currentProjectId || null,
        projektNamn: stored.projektNamn || '',
        datum: stored.datum || window.APP_DATA.todayIso(),
        rum: stored.rum || []
      };
    }

    // Ej inloggad (eller ingen storage) → login-vy.
    return Object.assign(
      { view: 'login', auth: { loggedIn: false, user: null }, savedProjects: (stored && stored.savedProjects) || [], currentProjectId: null },
      emptyCalc()
    );
  }

  // Fas 5 (2026-04-22): async bootstrap. Laddar app-config.json innan rendering.
  async function bootstrap() {
    // 1. Ladda priskonfiguration. I dist-läge (inline JSON) behövs ingen URL —
    //    loadConfig hämtar från window.APP_CONFIG_JSON. I dev-läge fetch:ar vi filen.
    try {
      await window.APP_DATA.loadConfig('app-config.json');
    } catch (err) {
      console.error('Kunde inte ladda app-config.json:', err);
      document.body.innerHTML = `
        <div style="padding:48px 32px; max-width:640px; margin:40px auto; font-family:system-ui, sans-serif; line-height:1.5; color:#1A1A1A;">
          <h1 style="margin:0 0 12px; font-size:22px;">Kunde inte starta Renoveringskalkyl</h1>
          <p style="margin:0 0 12px;">App-konfigurationen (<code>app-config.json</code>) kunde inte laddas.</p>
          <p style="margin:0 0 12px; color:#3C3C3B;"><strong>Fel:</strong> ${err.message}</p>
          <p style="margin:0 0 12px;">Kontrollera att du öppnat appen via dev-servern (<code>python src/dev_server.py</code> → <code>http://localhost:5520/</code>) eller via den inbäddade <code>dist/renoveringskalkyl.html</code>.</p>
          <p style="margin:0; color:#7A7A79; font-size:13px;">För utvecklare: kör <code>npm run build-config</code> för att generera app-config.json från master.xlsx.</p>
        </div>
      `;
      return;
    }

    // 2. Uppdatera runtime-refs till ROOM_TYPES och ROOM_TYPE_ORDER från loadConfig.
    ROOM_TYPES = window.APP_DATA.ROOM_TYPES;
    ROOM_TYPE_ORDER = window.APP_DATA.ROOM_TYPE_ORDER;

    // 3. Initiera state (samma som tidigare, men nu efter config är laddad).
    state = initialState();

    // Del III (2026-04-22): expanderbara item-paneler — session-bundet state.
    state.expandedItems = new Set();

    // Graceful upgrade: kör syncFollowups för varje laddat rum.
    if (state.rum && state.rum.length) {
      state.rum.forEach((rum) => window.APP_DATA.syncFollowups(rum));
    }
    if (state.savedProjects) {
      state.savedProjects.forEach((p) => {
        if (p.rum) p.rum.forEach((rum) => window.APP_DATA.syncFollowups(rum));
      });
    }

    document.addEventListener('click', onClick);
    document.addEventListener('input', onInput);
    document.addEventListener('blur', onBlur, true);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('pointerdown', onDragHandlePointerDown);
    document.addEventListener('pointerdown', onStepperPointerDown);

    window.addEventListener('beforeprint', renderPrintLayout);

    render();

    // Exponera för debugging.
    window.APP = {
      get state() { return state; },
      get uiState() { return uiState; },
      render,
      updateActiveFromScroll,
      setupScrollSpy
    };
  }

  bootstrap();
})();
