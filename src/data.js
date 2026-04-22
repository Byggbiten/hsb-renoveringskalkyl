/**
 * data.js (v1.7) — Schema, helpers, SVG-ikoner + dynamisk config-loader.
 *
 * Priser och rumskonfiguration bor nu i prices.json (genererad från master.xlsx
 * via scripts/build-config.js). Den här filen exponerar:
 *  - SVG-ikoner (konstanter)
 *  - Beräknings-helpers (calcItemTotal, calcWallArea, calcPerimeter, …)
 *  - window.APP_DATA.loadConfig(url) som fetch:ar och expanderar prices-config
 *    till fullständig ROOM_TYPES-struktur (backward compat med tidigare direkta
 *    items-konstanter i app.js).
 *
 * Bootstrap-flöde i app.js: await APP_DATA.loadConfig(...) innan rendering.
 */

(function (global) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  // Konstanter
  // ═══════════════════════════════════════════════════════════════════

  const DEFAULT_CEILING_HEIGHT = 2.4;
  const TIM_FAKTOR = 930;     // 250 kr/h × 3.72 omkostnadspåslag
  const UE_FAKTOR = 1.10;     // 10 % UE-påslag

  // ═══════════════════════════════════════════════════════════════════
  // SVG-ikoner (oförändrade från tidigare versioner)
  // ═══════════════════════════════════════════════════════════════════

  const PUZZLE_SVG = '<svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M4 12h10V6a2 2 0 0 1 4 0v6h10v10a2 2 0 0 1 0 4h-10v-4a2 2 0 0 0-4 0v4H4V12z" fill="currentColor"/></svg>';

  const ICON_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"';
  const ICON_VARDAGSRUM = `<svg ${ICON_ATTRS}><path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2"/><path d="M2 13v3a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-3a2 2 0 0 0-4 0v1H6v-1a2 2 0 0 0-4 0z"/><path d="M5 18v2M19 18v2"/></svg>`;
  const ICON_SOVRUM = `<svg ${ICON_ATTRS}><path d="M3 19v-9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9"/><path d="M3 15h18"/><path d="M3 19v2M21 19v2"/><circle cx="7.5" cy="12" r="1.5"/></svg>`;
  const ICON_HALL = `<svg ${ICON_ATTRS}><path d="M12 3a2 2 0 0 0-2 2c0 1 1 1.7 2 2-4 2-7 4-7 7v4h14v-4c0-3-3-5-7-7 1-.3 2-1 2-2a2 2 0 0 0-2-2z"/></svg>`;
  const ICON_ENTRE = `<svg ${ICON_ATTRS}><rect x="6" y="3" width="12" height="18" rx="1"/><circle cx="14.5" cy="12" r="0.9" fill="currentColor" stroke="none"/><path d="M3 21h18"/></svg>`;
  const ICON_KOK = `<svg ${ICON_ATTRS}><path d="M4 10h16v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M2 10h20"/><path d="M8 7V4M12 7V4M16 7V4"/></svg>`;
  const ICON_BADRUM = `<svg ${ICON_ATTRS}><path d="M3 13h18v3a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z"/><path d="M6 13V7a2 2 0 0 1 4 0"/><path d="M5 19v2M19 19v2"/><path d="M9 7.5h1"/></svg>`;
  const ICON_TOALETT = `<svg ${ICON_ATTRS}><path d="M6 4h12v5a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z"/><path d="M8 12l-2 7h12l-2-7"/><path d="M10 19v2M14 19v2"/></svg>`;
  const ICON_OVRIGT = `<svg ${ICON_ATTRS}><path d="M14.5 7a3.5 3.5 0 1 1 3.5 3.5L9 19.5a2.5 2.5 0 1 1-3.5-3.5z"/><path d="M14 7l-2-2"/></svg>`;

  const ICON_MAP = {
    ICON_VARDAGSRUM, ICON_SOVRUM, ICON_HALL, ICON_ENTRE,
    ICON_KOK, ICON_BADRUM, ICON_TOALETT, ICON_OVRIGT
  };

  // ═══════════════════════════════════════════════════════════════════
  // Runtime state — sätts av loadConfig()
  // ═══════════════════════════════════════════════════════════════════

  let ROOM_TYPES = null;
  let ROOM_TYPE_ORDER = null;
  let ITEMS_BY_ID = null;   // snabb lookup för följepost-expansion vid UI-rendering

  // ═══════════════════════════════════════════════════════════════════
  // Config-loader: läs app-config.json och bygg ROOM_TYPES
  // ═══════════════════════════════════════════════════════════════════

  async function loadConfig(url) {
    let cfg;
    if (typeof global.APP_CONFIG_JSON !== 'undefined') {
      // Dist-läge: JSON inline i HTML
      cfg = global.APP_CONFIG_JSON;
    } else if (url) {
      const resp = await fetch(url, { cache: 'no-cache' });
      if (!resp.ok) throw new Error(`Kunde inte ladda ${url}: HTTP ${resp.status}`);
      cfg = await resp.json();
    } else {
      throw new Error('loadConfig kräver antingen window.APP_CONFIG_JSON eller en URL.');
    }
    buildRoomTypes(cfg);
    return cfg;
  }

  function buildRoomTypes(cfg) {
    ITEMS_BY_ID = {};
    // Expandera varje item med info-struktur + derive-properties
    for (const [id, raw] of Object.entries(cfg.items)) {
      const expanded = expandItem(raw);
      ITEMS_BY_ID[id] = expanded;
    }

    // Bygg ROOM_TYPES med expanderade items + följeposter
    ROOM_TYPES = {};
    for (const [typ, raw] of Object.entries(cfg.roomTypes)) {
      const roomItems = (raw.items || []).map((refItem) => {
        const base = ITEMS_BY_ID[refItem.id];
        if (!base) throw new Error(`Item "${refItem.id}" i rumstyp "${typ}" finns inte i items.`);
        // Skapa en kopia så rum-specifika overrides (group, followups) inte påverkar globala items
        const roomItem = Object.assign({}, base);
        if (refItem.group) roomItem.group = refItem.group;
        if (refItem.followups) {
          roomItem.followups = refItem.followups.map((fuRef) => {
            const fuBase = ITEMS_BY_ID[fuRef.id];
            if (!fuBase) throw new Error(`Följepost "${fuRef.id}" i rumstyp "${typ}" finns inte i items.`);
            return Object.assign({}, fuBase, {
              defaultChecked: !!fuRef.defaultChecked,
              inheritsReducesFloor: !!fuRef.inheritsReducesFloor,
              inheritsParentArea: !!fuRef.inheritsParentArea
            });
          });
        }
        return roomItem;
      });

      const roomFollowups = (raw.roomFollowups || []).map((rfuRef) => {
        const base = ITEMS_BY_ID[rfuRef.id];
        if (!base) throw new Error(`Rumsföljepost "${rfuRef.id}" i rumstyp "${typ}" finns inte i items.`);
        return Object.assign({}, base, {
          defaultChecked: !!rfuRef.defaultChecked,
          triggeredBy: rfuRef.triggeredBy || [],
          renderInCategory: rfuRef.renderInCategory || ''
        });
      });

      ROOM_TYPES[typ] = {
        displayName: raw.displayName,
        defaultArea: Number(raw.defaultArea || 0),
        type: raw.type || 'per_post',
        icon: ICON_MAP[raw.iconId] || PUZZLE_SVG,
        hideArea: !!raw.hideArea,
        items: roomItems,
        roomFollowups: roomFollowups,
        defaultOnCreate: raw.defaultOnCreate || {}
      };
    }

    ROOM_TYPE_ORDER = cfg.roomOrder || Object.keys(ROOM_TYPES);
  }

  // Expandera ett rå-item från JSON till internt format som app.js förväntar sig.
  // Backward compat: item.info = { ingar, ingarEj, wikellsRef, image }.
  // Booleska flaggor (hasCount, perimeterCalc etc.) ligger redan direkt på objektet.
  function expandItem(raw) {
    const ingar = (raw.ingar && raw.ingar.length) ? raw.ingar : (raw.rawArticles || []);
    const item = Object.assign({}, raw, {
      info: {
        ingar,
        ingarEj: raw.ingarEj || [],
        wikellsRef: raw.wikellsRef || '',
        image: null
      }
    });
    return item;
  }

  // ═══════════════════════════════════════════════════════════════════
  // Beräknings-helpers
  // ═══════════════════════════════════════════════════════════════════

  // Omkrets för kvadratiskt rum med golvyta yta.
  function calcPerimeter(yta) {
    return 4 * Math.sqrt(Math.max(0, yta || 0));
  }

  // Väggyta = omkrets × takhöjd.
  function calcWallArea(yta, takhojd) {
    return calcPerimeter(yta) * (takhojd || DEFAULT_CEILING_HEIGHT);
  }

  // Summa av alla reducesFloor-items (t.ex. entre_klinker) i ett rum.
  // Returnerar m² som ska dras av från andra golv-items.
  function reducedFloorArea(rum) {
    if (!rum || !rum.valda || !ROOM_TYPES) return 0;
    const rt = ROOM_TYPES[rum.typ];
    if (!rt) return 0;
    let total = 0;
    for (const item of rt.items) {
      if (!item.reducesFloor) continue;
      const valt = rum.valda[item.id];
      if (!valt || !valt.checked) continue;
      total += Math.max(0, valt.area || 0);
    }
    return total;
  }

  // Räknar ut kr-belopp för ett item baserat på beräkningsflaggor.
  // Ordning: hasCount → hasArea → wallCalc → perimeterCalc → unit='kr/m²' (golvyta).
  function calcItemTotal(item, valt, rum) {
    if (!valt || !valt.checked) return 0;
    if (item.unit === 'schablon') return item.price;
    if (item.hasCount) {
      const n = Math.max(0, Math.min(20, valt.count || 0));
      return item.price * n;
    }
    if (item.hasArea) {
      const a = Math.max(0, valt.area || 0);
      return item.price * a;
    }
    if (item.wallCalc) {
      return item.price * calcWallArea(rum.yta, rum.takhojd);
    }
    if (item.perimeterCalc) {
      return item.price * calcPerimeter(rum.yta);
    }
    if (item.unit === 'kr/m²') {
      let yta = rum.yta;
      if (item.group === 'golv') {
        yta = Math.max(0, yta - reducedFloorArea(rum));
      }
      return item.price * yta;
    }
    return 0;
  }

  // Räknar ut kr-belopp för en följepost.
  function calcFollowupTotal(fu, parentItem, rum, parentValt) {
    if (fu.unit === 'schablon') return fu.price;
    if (fu.unit === 'kr/m²') {
      let yta;
      if (parentItem && parentItem.hasArea && fu.inheritsParentArea) {
        yta = Math.max(0, (parentValt && parentValt.area) || 0);
      } else if (parentItem && parentItem.group === 'golv' && fu.inheritsReducesFloor) {
        yta = Math.max(0, rum.yta - reducedFloorArea(rum));
      } else {
        yta = rum.yta;
      }
      return fu.price * yta;
    }
    if (fu.unit === 'kr/m') {
      return fu.price * calcPerimeter(rum.yta);
    }
    if (fu.unit === 'kr/st') {
      const count = parentValt && parentValt.count != null ? parentValt.count : 1;
      return fu.price * count;
    }
    return 0;
  }

  // Är en typ B-följepost aktiv? Tom/saknad triggeredBy = alltid aktiv.
  function isRoomFollowupTriggered(rfu, rum) {
    if (!rfu.triggeredBy || rfu.triggeredBy.length === 0) return true;
    return rfu.triggeredBy.some(
      (triggerId) => rum.valda[triggerId] && rum.valda[triggerId].checked
    );
  }

  // Subtotal för ett rum: items + typ A-följeposter + aktiva typ B-följeposter.
  function calcRoomSubtotal(rum) {
    if (!ROOM_TYPES) return 0;
    const rt = ROOM_TYPES[rum.typ];
    if (!rt) return 0;
    let sum = 0;
    for (const item of rt.items) {
      const valt = rum.valda[item.id];
      sum += calcItemTotal(item, valt, rum);
      if (valt && valt.checked && item.followups) {
        for (const fu of item.followups) {
          const fuValt = rum.valda[fu.id];
          if (fuValt && fuValt.checked) {
            sum += calcFollowupTotal(fu, item, rum, valt);
          }
        }
      }
    }
    for (const rfu of (rt.roomFollowups || [])) {
      const valt = rum.valda[rfu.id];
      if (valt && valt.checked && isRoomFollowupTriggered(rfu, rum)) {
        sum += calcFollowupTotal(rfu, null, rum, null);
      }
    }
    return sum;
  }

  // Total för hela state: summan av alla rums-subtotaler.
  function calcTotal(state) {
    if (!state || !state.rum) return 0;
    return state.rum.reduce((s, r) => s + calcRoomSubtotal(r), 0);
  }

  // Idempotent upgrade: lägg till saknade följepost-entries i rum.valda med rätt default.
  function syncFollowups(rum) {
    if (!ROOM_TYPES) return;
    const rt = ROOM_TYPES[rum.typ];
    if (!rt) return;
    // Typ A — per-huvudpost
    for (const item of rt.items) {
      if (!item.followups) continue;
      const parentChecked = !!(rum.valda[item.id] && rum.valda[item.id].checked);
      for (const fu of item.followups) {
        if (rum.valda[fu.id] !== undefined) continue;
        rum.valda[fu.id] = { checked: parentChecked && fu.defaultChecked };
      }
    }
    // Typ B — rums-scope
    if (rt.roomFollowups) {
      for (const rfu of rt.roomFollowups) {
        if (rum.valda[rfu.id] !== undefined) continue;
        const triggered = isRoomFollowupTriggered(rfu, rum);
        rum.valda[rfu.id] = { checked: triggered && rfu.defaultChecked };
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // Formattering & datum
  // ═══════════════════════════════════════════════════════════════════

  function formatKr(v) {
    if (v == null || isNaN(v)) return '0 kr';
    const rounded = Math.round(v);
    // Svensk tusensep med icke-brytande mellanslag
    return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' kr';
  }

  function todayIso() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  // ═══════════════════════════════════════════════════════════════════
  // Demo- och tomt state
  // ═══════════════════════════════════════════════════════════════════

  function demoState() {
    const st = {
      projektNamn: 'Brf Parken lgh 14 (demo)',
      datum: todayIso(),
      rum: [
        {
          id: 'r1', typ: 'vardagsrum', yta: 25, takhojd: DEFAULT_CEILING_HEIGHT,
          valda: {
            golv_ekparkett: { checked: true },
            malning_tak: { checked: true },
            malning_vagg: { checked: true }
          }
        },
        {
          id: 'r2', typ: 'sovrum', yta: 15, takhojd: DEFAULT_CEILING_HEIGHT,
          valda: {
            golv_ekparkett: { checked: true },
            innerdorr: { checked: true, count: 1 },
            malning_tak: { checked: true }
          }
        },
        {
          id: 'r3', typ: 'badrum', yta: 5, takhojd: DEFAULT_CEILING_HEIGHT,
          valda: {
            badrum_golv_klinker: { checked: true },
            badrum_vagg_kakel: { checked: true },
            badrum_wc_dusch: { checked: true, count: 1 },
            badrum_inredning: { checked: true, count: 1 },
            badrum_dorr: { checked: true, count: 1 },
            badrum_ue_el: { checked: true, count: 1 },
            badrum_ue_vs: { checked: true, count: 1 }
          }
        }
      ]
    };
    st.rum.forEach(syncFollowups);
    return st;
  }

  function emptyState() {
    return {
      projektNamn: '',
      datum: todayIso(),
      rum: []
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Export
  // ═══════════════════════════════════════════════════════════════════

  global.APP_DATA = {
    // Constants
    PUZZLE_SVG,
    DEFAULT_CEILING_HEIGHT,

    // Runtime (null innan loadConfig körts)
    get ROOM_TYPES() { return ROOM_TYPES; },
    get ROOM_TYPE_ORDER() { return ROOM_TYPE_ORDER; },

    // Loader
    loadConfig,

    // Helpers
    calcItemTotal,
    calcFollowupTotal,
    calcRoomSubtotal,
    calcTotal,
    calcPerimeter,
    calcWallArea,
    reducedFloorArea,
    isRoomFollowupTriggered,
    syncFollowups,
    formatKr,
    todayIso,
    demoState,
    emptyState
  };
})(window);
