/**
 * .apkg (Anki Package) generation for mobile-friendly Anki import.
 *
 * An .apkg file is a ZIP archive containing:
 *   - collection.anki2  (SQLite database with notes, cards, models, decks)
 *   - media              (JSON mapping, empty for text-only cards)
 *
 * Uses sql.js (SQLite compiled to WASM) and fflate (fast ZIP compression).
 */

import { zipSync, strToU8 } from 'fflate';

// ── sql.js lazy singleton ────────────────────────────────────

let _sqlPromise = null;

function getSql() {
  if (!_sqlPromise) {
    _sqlPromise = import('sql.js').then(mod => {
      const initSqlJs = mod.default;
      return initSqlJs({
        locateFile: file =>
          `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.14.0/${file}`,
      });
    });
  }
  return _sqlPromise;
}

// ── Helpers ──────────────────────────────────────────────────

const FIELD_SEP = '\x1f'; // Anki field separator

function guid64() {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,-./:;<=>?@[]^_`{|}~';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function fieldChecksum(data) {
  const buf = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(data),
  );
  return new DataView(buf).getUint32(0);
}

// ── Fixed IDs (consistent across exports from this app) ──────

const MODEL_ID = 1704067200000;  // fixed so Anki merges note types

// ── Model / deck definitions ─────────────────────────────────

function buildModel(modelId, langId) {
  // Choose font stack based on language
  const fontMap = {
    zh:  '"Noto Serif SC", "Songti SC", "SimSun", serif',
    yue: '"Noto Serif TC", "Songti TC", "PMingLiU", serif',
    ko:  '"Noto Serif KR", "Batang", serif',
  };
  const targetFont = fontMap[langId] || fontMap.zh;

  const css = `
.card {
  font-family: ${targetFont};
  font-size: 16px;
  text-align: center;
  color: #1a1814;
  background-color: #faf8f5;
  padding: 20px;
  line-height: 1.6;
}
.front { font-size: 42px; line-height: 1.4; margin: 20px 0; }
.romanization { font-family: sans-serif; font-size: 20px; color: #4a7c7e; margin: 10px 0; }
.translation  { font-family: sans-serif; font-size: 20px; margin: 10px 0; }
.examples { font-size: 15px; text-align: left; color: #555; margin-top: 16px; line-height: 1.8; }
.examples i { color: #888; font-size: 14px; }
`.trim();

  const qfmt = '<div class="front">{{Target}}</div>';
  const afmt = [
    '{{FrontSide}}',
    '<hr id=answer>',
    '<div class="romanization">{{Romanization}}</div>',
    '<div class="translation">{{Translation}}</div>',
    '{{#Examples}}<div class="examples">{{Examples}}</div>{{/Examples}}',
  ].join('\n');

  const now = Math.floor(Date.now() / 1000);

  return {
    [modelId]: {
      id: modelId,
      name: 'Graded Reader',
      type: 0,
      mod: now,
      usn: -1,
      sortf: 0,
      did: 1,
      tmpls: [
        {
          name: 'Card 1',
          ord: 0,
          qfmt,
          afmt,
          bqfmt: '',
          bafmt: '',
          did: null,
          bfont: '',
          bsize: 0,
        },
      ],
      flds: [
        { name: 'Target',        ord: 0, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
        { name: 'Romanization',  ord: 1, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
        { name: 'Translation',   ord: 2, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
        { name: 'Examples',      ord: 3, sticky: false, rtl: false, font: 'Arial', size: 20, media: [] },
      ],
      css,
      latexPre: '\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n',
      latexPost: '\\end{document}',
      latexsvg: false,
      req: [[0, 'all', [0]]],
      tags: [],
      vers: [],
    },
  };
}

function buildDeck(deckId, deckName) {
  const now = Math.floor(Date.now() / 1000);
  return {
    // Default deck (required by Anki)
    1: {
      id: 1,
      name: 'Default',
      mod: now,
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: false,
      browserCollapsed: false,
      desc: '',
      dyn: 0,
      conf: 1,
      extendNew: 10,
      extendRev: 50,
    },
    [deckId]: {
      id: deckId,
      name: deckName,
      mod: now,
      usn: -1,
      lrnToday: [0, 0],
      revToday: [0, 0],
      newToday: [0, 0],
      timeToday: [0, 0],
      collapsed: false,
      browserCollapsed: false,
      desc: '',
      dyn: 0,
      conf: 1,
      extendNew: 10,
      extendRev: 50,
    },
  };
}

function defaultConf() {
  return JSON.stringify({
    activeDecks: [1],
    curDeck: 1,
    newSpread: 0,
    collapseTime: 1200,
    timeLim: 0,
    estTimes: true,
    dueCounts: true,
    curModel: MODEL_ID,
    nextPos: 1,
    sortType: 'noteFld',
    sortBackwards: false,
    addToCur: true,
  });
}

function defaultDconf() {
  return JSON.stringify({
    1: {
      id: 1,
      name: 'Default',
      mod: 0,
      usn: 0,
      maxTaken: 60,
      autoplay: true,
      timer: 0,
      replayq: true,
      new: {
        bury: true,
        delays: [1, 10],
        initialFactor: 2500,
        ints: [1, 4, 7],
        order: 1,
        perDay: 20,
      },
      rev: {
        bury: true,
        ease4: 1.3,
        fuzz: 0.05,
        ivlFct: 1,
        maxIvl: 36500,
        perDay: 100,
        minSpace: 1,
      },
      lapse: {
        delays: [10],
        leechAction: 0,
        leechFails: 8,
        minInt: 1,
        mult: 0,
      },
      dyn: false,
    },
  });
}

// ── Main export function ─────────────────────────────────────

/**
 * Generate an .apkg Blob from an array of card objects.
 *
 * Each card: { target, romanization, translation, examples, tags }
 *   (all strings; examples may contain HTML)
 *
 * @param {Array} cards - Array of { target, romanization, translation, examples, tags }
 * @param {string} deckName - Name of the Anki deck
 * @param {string} langId - Language ID for styling
 * @returns {Promise<Blob>} - The .apkg file as a Blob
 */
export async function generateApkgBlob(cards, deckName, langId = 'zh') {
  const SQL = await getSql();
  const db = new SQL.Database();

  const now = Math.floor(Date.now() / 1000);
  const deckId = Date.now();

  // Create tables
  db.run(`
    CREATE TABLE col (
      id integer primary key, crt integer not null, mod integer not null,
      scm integer not null, ver integer not null, dty integer not null,
      usn integer not null, ls integer not null, conf text not null,
      models text not null, decks text not null, dconf text not null,
      tags text not null
    )
  `);
  db.run(`
    CREATE TABLE notes (
      id integer primary key, guid text not null, mid integer not null,
      mod integer not null, usn integer not null, tags text not null,
      flds text not null, sfld text not null, csum integer not null,
      flags integer not null, data text not null
    )
  `);
  db.run(`
    CREATE TABLE cards (
      id integer primary key, nid integer not null, did integer not null,
      ord integer not null, mod integer not null, usn integer not null,
      type integer not null, queue integer not null, due integer not null,
      ivl integer not null, factor integer not null, reps integer not null,
      lapses integer not null, left integer not null, odue integer not null,
      odid integer not null, flags integer not null, data text not null
    )
  `);
  db.run(`
    CREATE TABLE revlog (
      id integer primary key, cid integer not null, usn integer not null,
      ease integer not null, ivl integer not null, lastIvl integer not null,
      factor integer not null, time integer not null, type integer not null
    )
  `);
  db.run(`
    CREATE TABLE graves (
      usn integer not null, oid integer not null, type integer not null
    )
  `);

  // Insert collection metadata
  const models = buildModel(MODEL_ID, langId);
  const decks = buildDeck(deckId, deckName);

  db.run(
    `INSERT INTO col VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1,                             // id
      now,                           // crt (created)
      now,                           // mod (modified)
      now * 1000,                    // scm (schema modified, ms)
      11,                            // ver (schema version)
      0,                             // dty (dirty)
      0,                             // usn
      0,                             // ls (last sync)
      defaultConf(),                 // conf
      JSON.stringify(models),        // models
      JSON.stringify(decks),         // decks
      defaultDconf(),                // dconf
      JSON.stringify({}),            // tags
    ],
  );

  // Insert notes and cards
  const baseId = Date.now();

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    const noteId = baseId + i * 2;
    const cardId = baseId + i * 2 + 1;

    const flds = [
      card.target || '',
      card.romanization || '',
      card.translation || '',
      card.examples || '',
    ].join(FIELD_SEP);

    const sfld = card.target || '';
    const csum = await fieldChecksum(sfld);

    // Insert note
    db.run(
      `INSERT INTO notes VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        noteId,           // id
        guid64(),         // guid
        MODEL_ID,         // mid (model id)
        now,              // mod
        -1,               // usn
        ` ${card.tags || ''} `, // tags (space-padded)
        flds,             // flds (field separator-joined)
        sfld,             // sfld (sort field)
        csum,             // csum (checksum of sort field)
        0,                // flags
        '',               // data
      ],
    );

    // Insert card
    db.run(
      `INSERT INTO cards VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cardId,  // id
        noteId,  // nid (note id)
        deckId,  // did (deck id)
        0,       // ord (template ordinal)
        now,     // mod
        -1,      // usn
        0,       // type (0 = new)
        0,       // queue (0 = new)
        i + 1,   // due (position for new cards)
        0,       // ivl
        0,       // factor
        0,       // reps
        0,       // lapses
        0,       // left
        0,       // odue
        0,       // odid
        0,       // flags
        '',      // data
      ],
    );
  }

  // Export the database to a Uint8Array
  const dbData = db.export();
  db.close();

  // Create the .apkg ZIP archive
  const zipData = zipSync({
    'collection.anki2': new Uint8Array(dbData),
    'media': strToU8('{}'),
  });

  return new Blob([zipData], { type: 'application/zip' });
}
