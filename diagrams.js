/* Renderers for the frontend architecture catalog. No dependency or browser globals required. */
(function (root, factory) {
  const API = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (root) root.PatternDiagrams = API;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : null, function () {
  'use strict';

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
  }

  const LABELS = {
    client: 'Client', cdn: 'CDN / livraison', gateway: 'Gateway',
    bff: 'BFF / fonction', service: 'Service', data: 'Données',
    security: 'Identité / secrets', event: 'Messages / workflow',
    build: 'Construction', observability: 'Observabilité'
  };

  function nodeClass(kind) {
    return Object.prototype.hasOwnProperty.call(LABELS, kind) ? kind : 'service';
  }

  function preview(pattern) {
    const parts = pattern.preview || pattern.diagram.map(item => item[0]);
    return '<div class="preview-label">Aperçu du parcours · schéma complet dans la fiche</div>' +
      '<div class="chain chain-expanded" aria-label="Aperçu : ' + escapeHTML(parts.join(' vers ')) + '">' +
      parts.map((name, i) =>
        (i ? '<span class="arr" aria-hidden="true">→</span>' : '') +
        '<div class="node client-preview">' + escapeHTML(name) + '</div>').join('') +
      '</div>';
  }

  function wrapText(text, maxWidth, maxLines) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const word of words) {
      if (line && (line + ' ' + word).length > maxWidth) {
        lines.push(line);
        line = word;
      } else line = line ? line + ' ' + word : word;
    }
    if (line) lines.push(line);
    if (lines.length > maxLines) {
      const clipped = lines.slice(0, maxLines);
      clipped[maxLines - 1] = clipped[maxLines - 1].slice(0, maxWidth - 1).trimEnd() + '…';
      return clipped;
    }
    return lines;
  }

  function svgText(lines, x, y, fontSize, className, lineHeight) {
    return '<text x="' + x + '" y="' + y + '" text-anchor="middle" class="' + className +
      '" font-size="' + fontSize + '">' +
      lines.map((line, i) => '<tspan x="' + x + '" dy="' + (i ? lineHeight : 0) + '">' +
        escapeHTML(line) + '</tspan>').join('') + '</text>';
  }

  function renderVertical(pattern) {
    const arch = pattern.architecture;
    if (!arch || !Array.isArray(arch.stages)) return '';
    const W = 1120, H = 112, GAP = 66, TOP = 22, OFFSET = 185, CONTENT = 865;
    const rows = arch.stages.map((stage, index) => {
      const y = TOP + index * (H + GAP);
      const nodes = stage.nodes;
      const margin = 20, available = CONTENT - 2 * margin;
      const cell = Math.min(276, (available - 20 * (nodes.length - 1)) / nodes.length);
      const total = cell * nodes.length + 20 * (nodes.length - 1);
      const start = OFFSET + (CONTENT - total) / 2;
      return {
        label: stage.label, y: y, nodes: nodes.map((n, i) => ({
          ...n, x: start + i * (cell + 20), y: y + 12, w: cell, h: 88,
          cx: start + i * (cell + 20) + cell / 2
        }))
      };
    });
    const height = TOP * 2 + rows.length * H + Math.max(0, rows.length - 1) * GAP;
    const indexed = new Map();
    rows.forEach((r, i) => r.nodes.forEach(n => indexed.set(n.id, { ...n, row: i })));
    const stagePanels = rows.map((row, i) => (
      '<rect x="9" y="' + row.y + '" width="1102" height="' + H +
      '" rx="16" fill="' + (i % 2 ? '#0d1c2d' : '#101e30') + '" stroke="#283951"/>' +
      '<text x="24" y="' + (row.y + 40) + '" class="stage-label">' +
      escapeHTML((i + 1) + '. ' + row.label) + '</text>' +
      '<text x="24" y="' + (row.y + 63) + '" class="stage-sub">' +
      escapeHTML(row.nodes.length + (row.nodes.length > 1 ? ' composants' : ' composant')) + '</text>'
    )).join('');
    const edges = arch.links.map(edge => {
      const a = indexed.get(edge.from), b = indexed.get(edge.to);
      if (!a || !b) return '';
      const same = a.row === b.row, forward = a.x < b.x;
      let path;
      if (same) {
        const sy = a.y + a.h / 2;
        const ax = forward ? a.x + a.w : a.x;
        const bx = forward ? b.x - 9 : b.x + b.w + 9;
        path = 'M ' + ax + ' ' + sy + ' L ' + bx + ' ' + sy;
      } else {
        const ax = a.cx, ay = a.y + a.h + 4, bx = b.cx, by = b.y - 10;
        const mid = (ay + by) / 2;
        // Long spans are routed through the right margin instead of crossing intermediate components.
        if (b.row - a.row > 1) {
          const right = 1082 - (Math.abs(edge.from.length + edge.to.length) % 3) * 8;
          path = 'M ' + ax + ' ' + ay + ' L ' + right + ' ' + (ay + 17) +
            ' L ' + right + ' ' + (by - 17) + ' L ' + bx + ' ' + by;
        } else {
          path = 'M ' + ax + ' ' + ay + ' C ' + ax + ' ' + mid + ', ' + bx +
            ' ' + mid + ', ' + bx + ' ' + by;
        }
      }
      const type = ['asset','async','auth','deploy','telemetry'].includes(edge.type) ? edge.type : 'api';
      return '<path class="edge edge-' + type + '" d="' + path +
        '" fill="none" marker-end="url(#arrow-' + type + ')">' +
        '<title>' + escapeHTML(a.name + ' → ' + b.name + ' · ' + edge.label) + '</title></path>';
    }).join('');
    const renderedNodes = rows.flatMap(row => row.nodes).map(n => {
      const category = nodeClass(n.kind);
      const names = wrapText(n.name, n.w < 225 ? 20 : 25, 2);
      const details = wrapText(n.detail, n.w < 225 ? 22 : 30, 2);
      const nameY = n.y + (names.length === 1 ? 37 : 29);
      const detailY = n.y + (names.length === 1 ? 61 : 58);
      return '<g><rect x="' + n.x + '" y="' + n.y + '" width="' + n.w +
        '" height="' + n.h + '" rx="12" class="arch-node arch-node-' + category + '"/>' +
        svgText(names, n.cx, nameY, 15, 'arch-node-title', 18) +
        svgText(details, n.cx, detailY, 11, 'arch-node-caption', 14) +
        '<title>' + escapeHTML(n.name + ' : ' + n.detail + ' (' + LABELS[category] + ')') + '</title></g>';
    }).join('');

    const markerTypes = ['api','asset','async','auth','deploy','telemetry'];
    const colors = { api:'#79d6d3', asset:'#a8a4ef', async:'#f1c678', auth:'#e9b5a6', deploy:'#a8a4ef', telemetry:'#95cba9' };
    const markers = markerTypes.map(type =>
      '<marker id="arrow-' + type + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M 1 1 L 9 5 L 1 9 Z" fill="' + colors[type] + '"/></marker>').join('');
    const description = 'Architecture verticale de ' + pattern.title + '. Étapes : ' +
      arch.stages.map(r => r.label + ' : ' + r.nodes.map(n => n.name).join(', ')).join(' ; ');
    const legend = '<div class="diagram-legend"><span class="legend-item"><i class="legend-api"></i>Appel API / données</span>' +
      '<span class="legend-item"><i class="legend-asset"></i>Distribution / construction</span>' +
      '<span class="legend-item"><i class="legend-async"></i>Événement / asynchrone</span>' +
      '<span class="legend-item"><i class="legend-auth"></i>Identité / secrets</span></div>';
    const flows = '<details class="flow-details"><summary>Voir les ' + arch.links.length + ' liaisons et protocoles</summary>' +
      '<ol>' + arch.links.map(e => {
        const a = indexed.get(e.from), b = indexed.get(e.to);
        return '<li>' + escapeHTML((a ? a.name : e.from) + ' → ' +
          (b ? b.name : e.to)) + ' <span>' + escapeHTML(e.label) + '</span></li>';
      }).join('') + '</ol></details>';
    const transverse = (arch.transverse || []).length ?
      '<div class="arch-cross"><strong>À prévoir en transverse</strong>' +
      '<ul>' + arch.transverse.map(t => '<li>' + escapeHTML(t) + '</li>').join('') + '</ul></div>' : '';
    return '<figure class="architecture-figure" aria-label="Schéma technique vertical du pattern">' +
      '<div class="diagram-scroll"><svg class="architecture-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
      W + ' ' + height + '" width="' + W + '" height="' + height + '" role="img" aria-label="' +
      escapeHTML(description) + '"><title>' + escapeHTML('Schéma vertical — ' + pattern.title) +
      '</title><desc>' + escapeHTML(description) + '</desc><defs>' + markers + '</defs>' +
      stagePanels + edges + renderedNodes + '</svg></div>' +
      '<figcaption>Lecture de haut en bas. Les branches représentent des alternatives ou des appels parallèles : un CDN web ne transmet pas les requêtes API à la place du navigateur.</figcaption>' +
      legend + flows + transverse + '</figure>';
  }
  return { preview, renderVertical, escapeHTML, wrapText };
});
