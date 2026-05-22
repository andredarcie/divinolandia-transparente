// ── CLASSIFY ENTITY ──────────────────────────────────
const ENTITY_RULES = [
  [['folha', 'pagamento'],                                                                                     { label: 'Folha',              cls: 'tag-pref'  }],
  [['banco', 'bradesco', 'caixa', 'sicredi', 'sicob'],                                                        { label: 'Banco',              cls: 'tag-banco' }],
  [['inss', 'seguro social', 'previd', 'ipmd'],                                                               { label: 'Previdência',         cls: 'tag-gov'   }],
  [['receita federal', 'fazenda', 'tribunal', 'seg. pública', 'segurança pública', 'prodesp', 'secretaria'],  { label: 'Gov. Estadual/Fed.', cls: 'tag-gov'   }],
  [['transport', 'transer', 'caique'],                                                                        { label: 'Transporte',         cls: 'tag-tran'  }],
  [['farmac', 'hospitalar', 'medic', 'saúde', 'saude', 'mastolog', 'fonoudiolog', 'jaboque', 'nutric', 'gente segur'], { label: 'Saúde', cls: 'tag-saude' }],
  [['escola', 'ciee', 'integração', 'integra', 'inepa', 'pesquisa'],                                         { label: 'Educação',           cls: 'tag-edu'   }],
  [['lar da', 'lar de', 'gente amiga', 'osc', 'são vicente'],                                                { label: 'ONG/Social',         cls: 'tag-ong'   }],
  [['cpfl', 'sabesp', 'vivo', 'telefon', 'telecomunic', 'fb telec'],                                         { label: 'Serviços Públicos',  cls: 'tag-serv'  }],
];

function classifyEntity(nome) {
  const n = nome.toLowerCase();
  for (const [keywords, result] of ENTITY_RULES) {
    if (keywords.some(k => n.includes(k))) return result;
  }
  return { label: 'Outros', cls: 'tag-outros' };
}

// ── PAGING WRAPPER ───────────────────────────────────
function withPaging(renderFn, btnId, label) {
  return function(data, query) {
    const btn = document.getElementById(btnId);
    const isExpanded = btn && btn.dataset.expanded === '1';
    const limit = isExpanded ? Infinity : PAGE_SIZE;
    renderFn(data, query, limit);
    if (!btn) return;
    if (!data || data.length <= PAGE_SIZE || isExpanded) {
      btn.classList.add('hidden');
    } else {
      btn.classList.remove('hidden');
      btn.textContent = label + ' ↓';
      btn.onclick = () => {
        btn.dataset.expanded = '1';
        renderFn(data, query, Infinity);
        btn.classList.add('hidden');
      };
    }
  };
}

// ── RENDER: SALÁRIOS ─────────────────────────────────
function renderSalary(data, query = '', limit = Infinity) {
  const tbody   = document.getElementById('salaryBody');
  const empty   = document.getElementById('salaryEmpty');
  const counter = document.getElementById('salaryCount');

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.add('visible');
    counter.innerHTML = '<strong>0</strong> servidores';
    return;
  }

  empty.classList.remove('visible');
  counter.innerHTML = `<strong>${data.length}</strong> servidor${data.length !== 1 ? 'es' : ''}`;

  const slice = limit < Infinity ? data.slice(0, limit) : data;
  tbody.innerHTML = slice.map((d, i) => {
    const liq  = d.bruto - d.deducoes;
    const barW = (d.bruto / SALARY_MAX * 100).toFixed(1);
    const area = AREA_MAP[d.area] || { label: 'Outros', cls: 'tag-outros' };
    const rankHtml = i < 3
      ? `<span class="rank-top rank-${i + 1}">${i + 1}</span>`
      : `${i + 1}`;
    const rescisaoTag = d.tipo === 'Rescisão'
      ? `<span class="s-cargo-tag tag-rescisao" title="Verbas rescisórias — não representa salário mensal regular">Rescisão</span> `
      : '';

    return `<tr class="fade-row" style="animation-delay:${Math.min(i * 0.025, 0.5)}s">
      <td class="td-rank">${rankHtml}</td>
      <td class="td-name">
        <div class="s-name">${hl(d.nome, query)}</div>
        <div class="s-mat">Mat. confidencial</div>
      </td>
      <td>
        ${rescisaoTag}<span class="s-cargo-tag ${area.cls}">${area.label}</span>
        <div class="s-cargo-name">${hl(d.cargo, query)}</div>
        <div class="salary-bar-track">
          <div class="salary-bar-fill" style="width:${barW}%" data-sw="${barW}"></div>
        </div>
      </td>
      <td class="s-secretaria">${d.secretaria}</td>
      <td class="val-bruto">${fmtBR(d.bruto)}</td>
      <td class="val-dedu">-${fmtBR(d.deducoes)}</td>
      <td class="val-liq">${fmtBR(liq)}</td>
    </tr>`;
  }).join('');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.salary-bar-fill').forEach(el => {
      el.style.transform = `scaleX(${parseFloat(el.dataset.sw) / 100})`;
    });
  }));
}

function sortSalary(data, key) {
  return [...data].sort((a, b) => {
    if (key === 'nome')  return a.nome.localeCompare(b.nome, 'pt-BR');
    if (key === 'bruto') return b.bruto - a.bruto;
    if (key === 'liq')   return (b.bruto - b.deducoes) - (a.bruto - a.deducoes);
    return 0;
  });
}

function filterSalary(data, q) {
  if (!q) return data;
  const lq = normalizeQ(q);
  return data.filter(d => normalizeQ(`${d.nome} ${d.cargo} ${d.secretaria}`).includes(lq));
}

// ── RENDER: CREDORES ─────────────────────────────────
let currentData  = [...DATA];
let sortKey      = 'emp';
let searchQuery  = '';

function renderTable(data, query = '', limit = Infinity) {
  const tbody = document.getElementById('tableBody');
  const empty = document.getElementById('emptyState');

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.add('visible');
    document.getElementById('resultCount').innerHTML = '<strong>0</strong> resultados';
    return;
  }

  empty.classList.remove('visible');
  document.getElementById('resultCount').innerHTML =
    `<strong>${data.length}</strong> resultado${data.length !== 1 ? 's' : ''}`;

  const slice = limit < Infinity ? data.slice(0, limit) : data;
  tbody.innerHTML = slice.map((d, i) => {
    const pct    = d.valor_num > 0 ? (parseVal(d.pago) / d.valor_num * 100) : 0;
    const barW   = (d.valor_num / MAX_VAL * 100).toFixed(1);
    const barCls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const ent    = classifyEntity(d.nome);
    const rankHtml = i < 3
      ? `<span class="rank-top rank-${i + 1}">${i + 1}</span>`
      : `${i + 1}`;
    const pctCls = pct >= 75 ? 'pct-high'
      : pct >= 40 ? 'pct-mid'
      : pct >  0  ? 'pct-low'
      :             'pct-zero';

    return `<tr class="fade-row" style="animation-delay:${Math.min(i * 0.025, 0.5)}s">
      <td class="td-rank">${rankHtml}</td>
      <td class="td-name">
        <div class="entity-name">${hl(d.nome, query)}</div>
        <span class="type-tag ${ent.cls}">${ent.label}</span>
      </td>
      <td class="td-cnpj">${hl(d.cnpj, query)}</td>
      <td class="td-bar">
        <div class="bar-track">
          <div class="bar-fill ${barCls}" style="width:${barW}%" data-w="${barW}"></div>
        </div>
        <div class="bar-pct">${barW}% do maior</div>
      </td>
      <td class="td-value val-emp">${d.empenhado}</td>
      <td class="td-value val-pago">${d.pago}</td>
      <td class="td-pct"><span class="pct-pill ${pctCls}">${pct > 0 ? pct.toFixed(0) + '%' : '—'}</span></td>
    </tr>`;
  }).join('');

  requestAnimationFrame(() => requestAnimationFrame(() => {
    document.querySelectorAll('.bar-fill').forEach(el => {
      el.style.transform = `scaleX(${parseFloat(el.dataset.w) / 100})`;
    });
  }));
}

function sortData(data, key) {
  return [...data].sort((a, b) => {
    if (key === 'nome') return a.nome.localeCompare(b.nome, 'pt-BR');
    if (key === 'emp')  return b.valor_num - a.valor_num;
    if (key === 'pago') return parseVal(b.pago) - parseVal(a.pago);
    if (key === 'pct') {
      const pa = a.valor_num > 0 ? parseVal(a.pago) / a.valor_num : 0;
      const pb = b.valor_num > 0 ? parseVal(b.pago) / b.valor_num : 0;
      return pb - pa;
    }
    return 0;
  });
}

function filterData(data, q) {
  if (!q) return data;
  const lq = normalizeQ(q);
  return data.filter(d =>
    normalizeQ(d.nome).includes(lq) || d.cnpj.toLowerCase().includes(lq)
  );
}

function updateStats() {
  const totalEmp  = DATA.reduce((s, d) => s + d.valor_num, 0);
  const totalPago = DATA.reduce((s, d) => s + parseVal(d.pago), 0);
  const pct = totalPago / totalEmp * 100;
  const fmt = n => n >= 1e6
    ? 'R$ ' + (n / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' M'
    : fmtBR(n);

  document.getElementById('stat-emp').textContent   = fmt(totalEmp);
  document.getElementById('stat-pago').textContent  = fmt(totalPago);
  document.getElementById('stat-pct').textContent   = pct.toFixed(1) + '%';
  document.getElementById('stat-count').textContent = DATA.length;
}

// ── RENDER: EMPENHOS ─────────────────────────────────
function renderEmpenhos(data, query, limit = Infinity) {
  const body  = document.getElementById('empBody');
  const empty = document.getElementById('empEmpty');
  const count = document.getElementById('empCount');
  if (!body) return;

  const q = (query || '').toLowerCase().trim();
  const filtered = q
    ? data.filter(d =>
        (d.credor    || '').toLowerCase().includes(q) ||
        (d.descricao || '').toLowerCase().includes(q) ||
        (d.categoria || '').toLowerCase().includes(q))
    : data;

  count.innerHTML = `<strong>${filtered.length}</strong> empenho${filtered.length !== 1 ? 's' : ''}`;

  if (!filtered.length) {
    body.innerHTML = '';
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';

  const slice = limit < Infinity ? filtered.slice(0, limit) : filtered;
  body.innerHTML = slice.map(d => {
    const catCls    = CAT_CLASS[d.categoria] || 'cat-outros';
    const desc      = truncate(d.descricao || d.credor, 120);
    const sourceTag = d.fonte && d.fonte.includes('Restos')
      ? `<span style="font-size:0.6rem;color:#888;display:block;margin-top:2px;">Restos a Pagar 2025</span>`
      : '';
    return `<tr>
      <td><span class="emp-cat-badge ${catCls}">${d.categoria}</span></td>
      <td class="td-credor" title="${d.credor}">${truncate(d.credor, 35)}</td>
      <td class="td-desc" title="${d.descricao}">${desc}${sourceTag}</td>
      <td class="td-val">${fmtBR(d.valor)}</td>
    </tr>`;
  }).join('');
}

// ── SALARY STATS ─────────────────────────────────────
const SALARIO_MINIMO = 1518;

function renderSalaryStats(data) {
  const el = document.getElementById('salStats');
  if (!el) return;

  const folha = data.filter(d => d.tipo === 'Folha Mensal');
  const n = folha.length;
  if (n === 0) { el.innerHTML = ''; return; }

  const brutos  = folha.map(d => d.bruto).sort((a, b) => a - b);
  const total   = brutos.reduce((s, v) => s + v, 0);
  const media   = total / n;
  const mediana = n % 2 === 0
    ? (brutos[n / 2 - 1] + brutos[n / 2]) / 2
    : brutos[Math.floor(n / 2)];
  const abaixoMin = brutos.filter(v => v < SALARIO_MINIMO).length;

  const fmt = v => v >= 1e6
    ? 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' M'
    : fmtBR(v);

  const cards = [
    { label: 'Folha mensal (bruto)',  value: fmt(total),          sub: `${n} servidores ativos`                                         },
    { label: 'Média bruto',           value: fmtBR(media),        sub: `${(media / SALARIO_MINIMO).toFixed(1)} salários mínimos`          },
    { label: 'Mediana bruto',         value: fmtBR(mediana),      sub: `Metade ganha acima desse valor`                                  },
    { label: 'Abaixo do mínimo',      value: `${abaixoMin}`,      sub: `Menos de R$${SALARIO_MINIMO.toLocaleString('pt-BR')}/mês`, alert: true },
  ];

  el.innerHTML = cards.map(c => `
    <div class="sal-stat-card${c.alert ? ' sc-alert' : ''}">
      <span class="sal-stat-label">${c.label}</span>
      <span class="sal-stat-value">${c.value}</span>
      <span class="sal-stat-sub">${c.sub}</span>
    </div>`).join('');
}

// ── EMPENHOS STATS ───────────────────────────────────
function renderEmpStats(data) {
  const el = document.getElementById('empStats');
  if (!el || !data.length) { if (el) el.innerHTML = ''; return; }

  const total = data.reduce((s, d) => s + d.valor, 0);
  const media = total / data.length;

  const catTotals = {};
  data.forEach(d => { catTotals[d.categoria] = (catTotals[d.categoria] || 0) + d.valor; });
  const topCat   = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  const topPct   = (topCat[1] / total * 100).toFixed(0);

  const cards = [
    { label: 'Total empenhado',   value: fmtBR(total),      sub: `${data.length} empenho${data.length !== 1 ? 's' : ''}` },
    { label: 'Média por empenho', value: fmtBR(media),      sub: 'valor médio empenhado'                                  },
    { label: 'Maior categoria',   value: topCat[0],         sub: `${fmtBR(topCat[1])} · ${topPct}% do total`             },
  ];

  el.className = 'sal-stats cols-3';
  el.innerHTML = cards.map(c => `
    <div class="sal-stat-card">
      <span class="sal-stat-label">${c.label}</span>
      <span class="sal-stat-value">${c.value}</span>
      <span class="sal-stat-sub">${c.sub}</span>
    </div>`).join('');
}

// ── EXPORT CSV ────────────────────────────────────────
function exportCSV(rows, headers, filename) {
  const BOM = '﻿';
  const escape = v => `"${String(v).replace(/"/g, '""')}"`;
  const lines  = [headers.map(escape).join(';'),
                  ...rows.map(r => r.map(escape).join(';'))];
  const blob = new Blob([BOM + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

function exportSalaryCSV(data) {
  exportCSV(
    data.map(d => [d.nome, d.cargo, (AREA_MAP[d.area] || {}).label || d.area,
                   d.secretaria, d.bruto.toFixed(2).replace('.', ','),
                   d.deducoes.toFixed(2).replace('.', ','),
                   (d.bruto - d.deducoes).toFixed(2).replace('.', ','), d.tipo]),
    ['Nome', 'Cargo', 'Área', 'Secretaria', 'Bruto', 'Deduções', 'Líquido', 'Tipo'],
    'salarios-divinolandia.csv'
  );
}

function exportCredoresCSV(data) {
  exportCSV(
    data.map(d => [d.nome, d.cnpj, d.empenhado, d.pago]),
    ['Credor', 'CNPJ', 'Empenhado', 'Pago'],
    'credores-divinolandia.csv'
  );
}

function exportEmpenhosCSV(data) {
  exportCSV(
    data.map(d => [d.categoria, d.credor, d.descricao || '', d.valor.toFixed(2).replace('.', ','), d.fonte || '']),
    ['Categoria', 'Credor', 'Descrição', 'Valor', 'Fonte'],
    'empenhos-divinolandia.csv'
  );
}

// ── AREA PIE CHART ───────────────────────────────────
const AREA_COLORS = {
  exec:   '#1565C0',
  adm:    '#6A1B9A',
  saude2: '#1B5E20',
  edu2:   '#E65100',
  eng:    '#BF360C',
  jur:    '#880E4F',
};

function renderAreaChart() {
  const el = document.getElementById('areaChart');
  if (!el) return;

  const agg = {};
  SALARY_DATA.forEach(d => {
    if (!agg[d.area]) agg[d.area] = { count: 0, sum: 0 };
    agg[d.area].count++;
    agg[d.area].sum += d.bruto;
  });
  const total = SALARY_DATA.length;

  const slices = Object.entries(agg)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([area, { count, sum }]) => ({
      area,
      count,
      pct:   count / total * 100,
      media: sum / count,
      label: (AREA_MAP[area] || {}).label || area,
      color: AREA_COLORS[area] || '#999',
    }));

  const cx = 100, cy = 100, R = 88, ri = 52;
  const GAP = 1.5;

  function xy(angleDeg, radius) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  }

  function donutPath(a0, a1) {
    const [ox1, oy1] = xy(a0, R);
    const [ox2, oy2] = xy(a1, R);
    const [ix2, iy2] = xy(a1, ri);
    const [ix1, iy1] = xy(a0, ri);
    const large = a1 - a0 > 180 ? 1 : 0;
    return `M${ox1} ${oy1} A${R} ${R} 0 ${large} 1 ${ox2} ${oy2} L${ix2} ${iy2} A${ri} ${ri} 0 ${large} 0 ${ix1} ${iy1}Z`;
  }

  let angle = 0;
  const paths = slices.map(s => {
    const sweep = s.pct / 100 * 360;
    const a0 = angle + GAP / 2;
    const a1 = angle + sweep - GAP / 2;
    angle += sweep;
    return `<path d="${donutPath(a0, a1)}" fill="${s.color}"/>`;
  });

  const svg = `<svg viewBox="0 0 200 200" width="160" height="160" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    ${paths.join('')}
    <text x="100" y="95"  text-anchor="middle" font-size="22" font-weight="700" fill="#1A1A2E" font-family="inherit">${total}</text>
    <text x="100" y="112" text-anchor="middle" font-size="9"  fill="#888"        font-family="inherit">servidores</text>
  </svg>`;

  const legend = slices.map(s => `
    <div class="ac-legend-row">
      <span class="ac-dot" style="background:${s.color}"></span>
      <span class="ac-lbl">${s.label}</span>
      <span class="ac-count">${s.count}</span>
      <span class="ac-pct">${s.pct.toFixed(1)}%</span>
      <span class="ac-media" title="Média bruto">${fmtBR(s.media)}</span>
    </div>`).join('');

  el.innerHTML = `<div class="ac-chart">${svg}</div><div class="ac-legend">${legend}</div>`;
}

// ── SORT HEADER HELPER ───────────────────────────────
function updateSortHeader(tableSelector, key, colMap, activeClass) {
  document.querySelectorAll(`${tableSelector} thead th`).forEach(th => {
    th.classList.remove(activeClass);
    const icon = th.querySelector('.sort-icon');
    if (icon) icon.textContent = '↕';
  });
  if (key !== 'nome' && colMap[key]) {
    const th = document.querySelectorAll(`${tableSelector} thead th`)[colMap[key] - 1];
    if (th) {
      th.classList.add(activeClass);
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = '↓';
    }
  }
}

// ── INIT ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  updateStats();

  // Credores
  const renderTablePaged = withPaging(renderTable, 'vmCredores', 'Ver todos os 50 credores');
  currentData = sortData(DATA, sortKey);
  renderTablePaged(currentData, searchQuery);

  document.getElementById('credExportBtn').addEventListener('click', () => exportCredoresCSV(currentData));

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    currentData = sortData(filterData(DATA, searchQuery), sortKey);
    renderTablePaged(currentData, searchQuery);
  });
  searchInput.addEventListener('keydown', e => {
    if (e.key === 'Escape') { searchInput.value = ''; searchInput.dispatchEvent(new Event('input')); }
  });

  const sortSelect = document.getElementById('sortSelect');
  sortSelect.addEventListener('change', () => {
    sortKey = sortSelect.value;
    currentData = sortData(filterData(DATA, searchQuery), sortKey);
    renderTablePaged(currentData, searchQuery);
    updateSortHeader('.data-table', sortKey, { emp: 5, pago: 6, pct: 7 }, 'sorted');
  });

  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      sortSelect.value = th.dataset.sort;
      sortSelect.dispatchEvent(new Event('change'));
    });
  });

  // Salários
  (function initSalarios() {
    const areaFiltersEl = document.getElementById('salaryAreaFilters');
    Object.entries(AREA_MAP).forEach(([key, val]) => {
      const btn = document.createElement('button');
      btn.className   = 'cat-btn';
      btn.dataset.sarea = key;
      btn.textContent = val.label;
      areaFiltersEl.appendChild(btn);
    });

    let sSortKey = 'bruto';
    let sQuery   = '';
    let sArea    = '';
    let sTipo    = '';
    let sFaixa   = '';

    const renderSalaryPaged = withPaging(renderSalary, 'vmSalarios', 'Ver todos os 493 servidores');

    function getFiltered() {
      let result = SALARY_DATA;
      if (sArea) result = result.filter(d => d.area === sArea);
      if (sTipo) result = result.filter(d => d.tipo === sTipo);
      if (sFaixa) {
        const [minStr, maxStr] = sFaixa.split('-');
        const min = Number(minStr);
        const max = maxStr ? Number(maxStr) : Infinity;
        result = result.filter(d => d.bruto >= min && d.bruto < max);
      }
      if (sQuery) result = filterSalary(result, sQuery);
      return result;
    }

    const clearBtn    = document.getElementById('salClearFilters');
    const salarySearch = document.getElementById('salarySearch');
    const salarySortSel = document.getElementById('salarySortSelect');
    const faixaSel    = document.getElementById('salaryFaixaSelect');
    const tipoFiltersEl = document.getElementById('salaryTipoFilters');

    function isFiltered() {
      return sArea || sTipo || sFaixa || sQuery;
    }

    function refresh() {
      const filtered = getFiltered();
      renderSalaryPaged(sortSalary(filtered, sSortKey), sQuery);
      renderSalaryStats(filtered);
      clearBtn.hidden = !isFiltered();
    }

    function resetAll() {
      sArea = ''; sTipo = ''; sFaixa = ''; sQuery = '';
      salarySearch.value  = '';
      faixaSel.value      = '';
      [areaFiltersEl, tipoFiltersEl].forEach(el => {
        el.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        el.querySelector('[data-sarea=""], [data-stipo=""]')?.classList.add('active');
      });
      refresh();
    }

    function wireChips(el, dataAttr, setter) {
      el.addEventListener('click', e => {
        const btn = e.target.closest('.cat-btn');
        if (!btn) return;
        el.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        setter(btn.dataset[dataAttr] || '');
        refresh();
      });
    }

    wireChips(areaFiltersEl, 'sarea', v => { sArea = v; });
    wireChips(tipoFiltersEl, 'stipo', v => { sTipo = v; });

    faixaSel.addEventListener('change', e => { sFaixa = e.target.value; refresh(); });
    salarySearch.addEventListener('input', e => { sQuery = e.target.value.trim(); refresh(); });
    salarySearch.addEventListener('keydown', e => {
      if (e.key === 'Escape') { salarySearch.value = ''; sQuery = ''; refresh(); }
    });
    clearBtn.addEventListener('click', resetAll);
    document.getElementById('salExportBtn').addEventListener('click', () => exportSalaryCSV(getFiltered()));

    salarySortSel.addEventListener('change', () => {
      sSortKey = salarySortSel.value;
      refresh();
      updateSortHeader('.salary-table', sSortKey, { bruto: 5, liq: 7 }, 'sorted-sal');
    });

    document.querySelectorAll('th[data-ssort]').forEach(th => {
      th.addEventListener('click', () => {
        salarySortSel.value = th.dataset.ssort;
        salarySortSel.dispatchEvent(new Event('change'));
      });
    });

    renderAreaChart();
    refresh();
  })();

  // Empenhos
  (function initEmpenhos() {
    const filtersEl = document.getElementById('catFilters');
    if (!filtersEl) return;

    const cats = [...new Set(EMPENHOS_DATA.map(d => d.categoria))].sort();
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className   = 'cat-btn';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      filtersEl.appendChild(btn);
    });

    let activeCat = '';
    let empQuery  = '';
    const getFiltered = () => activeCat
      ? EMPENHOS_DATA.filter(d => d.categoria === activeCat)
      : EMPENHOS_DATA;

    const renderEmpPaged = withPaging(renderEmpenhos, 'vmEmpenhos', 'Ver todos os empenhos');
    const refresh = () => {
      const filtered = getFiltered();
      renderEmpPaged(filtered, empQuery);
      renderEmpStats(filtered);
    };

    filtersEl.addEventListener('click', e => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      filtersEl.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      refresh();
    });

    const empSearchEl = document.getElementById('empSearch');
    if (empSearchEl) {
      empSearchEl.addEventListener('input', e => { empQuery = e.target.value; refresh(); });
      empSearchEl.addEventListener('keydown', e => {
        if (e.key === 'Escape') { empSearchEl.value = ''; empQuery = ''; refresh(); }
      });
    }

    document.getElementById('empExportBtn')?.addEventListener('click', () => exportEmpenhosCSV(getFiltered()));

    refresh();
  })();

  // Diárias
  (function initDiarias() {
    const d = DIARIAS_DATA;

    const stats = document.getElementById('diariasStats');
    if (stats) {
      stats.innerHTML = [
        { val: fmtBR(d.total_gasto), lbl: 'Total gasto'   },
        { val: d.total_empenhos,     lbl: 'Adiantamentos'  },
        { val: d.total_pessoas,      lbl: 'Pessoas'        },
      ].map(s =>
        `<div class="diaria-stat"><span class="ds-val">${s.val}</span><span class="ds-lbl">${s.lbl}</span></div>`
      ).join('');
    }

    const barsEl = document.getElementById('pessoaBars');
    if (barsEl) {
      const maxVal = d.por_pessoa[0].total;
      barsEl.innerHTML = d.por_pessoa.map(p => {
        const pct = (p.total / maxVal * 100).toFixed(1);
        return `<div class="pessoa-bar-row">
          <span class="pessoa-bar-nome" title="${p.nome} — ${p.secretaria}">${p.nome}</span>
          <div class="pessoa-bar-track"><div class="pessoa-bar-fill" style="width:0" data-w="${pct}"></div></div>
          <span class="pessoa-bar-val">${fmtBR(p.total)}</span>
          <span class="pessoa-bar-count">${p.viagens} viagem${p.viagens > 1 ? 's' : ''}</span>
        </div>`;
      }).join('');
      requestAnimationFrame(() => requestAnimationFrame(() => {
        document.querySelectorAll('.pessoa-bar-fill').forEach(el => { el.style.width = el.dataset.w + '%'; });
      }));
    }

    const tbody = document.getElementById('viagensBody');
    if (tbody) {
      tbody.innerHTML = d.detalhes.map(r =>
        `<tr>
          <td class="v-data">${r.data}</td>
          <td><div class="v-nome">${r.nome}</div><div class="v-sec">${r.secretaria}</div></td>
          <td class="v-desc">${r.descricao || '—'}</td>
          <td class="v-val">${fmtBR(r.valor)}</td>
        </tr>`
      ).join('');
    }
  })();

  // ── RECEITAS ─────────────────────────────────────────────────────────
  (() => {
    const d = RECEITAS_DATA;
    if (!d) return;

    const total = d.por_tipo.reduce((s, t) => s + t.valor, 0);
    const maior = d.por_tipo[0];

    const statsEl = document.getElementById('recStats');
    if (statsEl) {
      statsEl.innerHTML = [
        { label: 'Total Lançado (2025)', value: fmtBR(total), sub: `${d.por_mes.length} meses` },
        { label: 'Maior Fonte', value: maior.tipo, sub: fmtBR(maior.valor) },
        { label: 'Tipos de Receita', value: String(d.por_tipo.length), sub: 'categorias' },
      ].map(c => `<div class="sal-stat-card"><div class="sal-stat-label">${c.label}</div><div class="sal-stat-value">${c.value}</div><div class="sal-stat-sub">${c.sub}</div></div>`).join('');
    }

    const TIPO_COLORS = ['#2563eb','#16a34a','#ea580c','#7c3aed','#0891b2','#be185d','#92400e'];
    const tipoEl = document.getElementById('recTipoChart');
    if (tipoEl) {
      const cx = 90, cy = 90, R = 78, ri = 46, GAP = 1.5;
      function xy(a, r) { const rad = (a-90)*Math.PI/180; return [cx+r*Math.cos(rad), cy+r*Math.sin(rad)]; }
      let angle = 0;
      const paths = d.por_tipo.map((t, i) => {
        const sweep = (t.valor/total)*(360-GAP*d.por_tipo.length);
        const a0 = angle+GAP/2, a1 = angle+sweep+GAP/2; angle += sweep+GAP;
        const [ox1,oy1]=xy(a0,R),[ox2,oy2]=xy(a1,R),[ix2,iy2]=xy(a1,ri),[ix1,iy1]=xy(a0,ri);
        const lg = a1-a0>180?1:0;
        return `<path d="M${ox1} ${oy1} A${R} ${R} 0 ${lg} 1 ${ox2} ${oy2} L${ix2} ${iy2} A${ri} ${ri} 0 ${lg} 0 ${ix1} ${iy1}Z" fill="${TIPO_COLORS[i%TIPO_COLORS.length]}" opacity="0.92"><title>${t.tipo}: ${fmtBR(t.valor)}</title></path>`;
      });
      const legend = d.por_tipo.map((t,i) =>
        `<div class="ac-legend-row"><span class="ac-dot" style="background:${TIPO_COLORS[i%TIPO_COLORS.length]}"></span><span class="ac-lbl">${t.tipo}</span><span class="ac-pct">${((t.valor/total)*100).toFixed(1)}%</span></div>`).join('');
      tipoEl.innerHTML = `<div class="ac-media"><div class="ac-chart"><svg viewBox="0 0 180 180" width="180" height="180">${paths.join('')}<text x="90" y="86" text-anchor="middle" font-size="10" fill="#555">Total</text><text x="90" y="100" text-anchor="middle" font-size="9" fill="#333">${fmtBR(total)}</text></svg></div><div class="ac-legend">${legend}</div></div>`;
    }

    const mesEl = document.getElementById('recMesChart');
    if (mesEl && d.por_mes.length) {
      const maxMes = Math.max(...d.por_mes.map(m => m.valor));
      const ABR = {JANEIRO:'Jan',FEVEREIRO:'Fev','MARÇO':'Mar',MARCO:'Mar',ABRIL:'Abr',MAIO:'Mai',JUNHO:'Jun',JULHO:'Jul',AGOSTO:'Ago',SETEMBRO:'Set',OUTUBRO:'Out',NOVEMBRO:'Nov',DEZEMBRO:'Dez'};
      mesEl.innerHTML = `<div class="rec-bar-chart">${d.por_mes.map(m => {
        const pct = (m.valor/maxMes*100).toFixed(1);
        return `<div class="rec-bar-col"><div class="rec-bar-wrap"><div class="rec-bar" style="height:${pct}%" title="${fmtBR(m.valor)}"></div></div><div class="rec-bar-label">${ABR[m.mes]||m.mes.slice(0,3)}</div></div>`;
      }).join('')}</div>`;
    }

    const tbody = document.getElementById('recTributoBody');
    if (tbody) {
      const maxTributo = Math.max(...d.por_tributo.map(t => t.valor));
      // Group by tipo to render section headers
      const grouped = {};
      d.por_tributo.forEach(t => { (grouped[t.tipo] = grouped[t.tipo] || []).push(t); });
      const tipoOrder = d.por_tipo.map(t => t.tipo);
      let rank = 0;
      let html = '';
      tipoOrder.forEach(tipo => {
        const items = grouped[tipo];
        if (!items) return;
        const tipoColor = TIPO_COLORS[tipoOrder.indexOf(tipo) % TIPO_COLORS.length];
        const tipoTotal = items.reduce((s, t) => s + t.valor, 0);
        html += `<tr class="rec-group-header">
          <td colspan="4">
            <span class="rec-group-dot" style="background:${tipoColor}"></span>
            <strong>${tipo}</strong>
            <span class="rec-group-sub">${fmtBR(tipoTotal)} · ${((tipoTotal/total)*100).toFixed(1)}% do total</span>
          </td>
        </tr>`;
        items.forEach(t => {
          rank++;
          const barPct = (t.valor / maxTributo * 100).toFixed(1);
          const pct = ((t.valor / total) * 100).toFixed(2);
          html += `<tr class="rec-tributo-row">
            <td class="rec-rank">${rank}</td>
            <td class="rec-tributo-name">${t.tributo}</td>
            <td class="rec-tributo-bar-cell">
              <div class="rec-inline-bar"><div class="rec-inline-fill" style="width:${barPct}%;background:${tipoColor}"></div></div>
            </td>
            <td class="rec-tributo-val">${fmtBR(t.valor)}</td>
            <td class="rec-tributo-pct">${pct}%</td>
          </tr>`;
        });
      });
      tbody.innerHTML = html;
    }

    document.getElementById('recExportBtn')?.addEventListener('click', () => {
      exportCSV(
        d.por_tributo.map(t => [t.tipo, t.tributo, t.valor, ((t.valor/total)*100).toFixed(2)+'%']),
        ['Tipo','Tributo','Valor Lançado','% Total'],
        `receitas_${d.ano}.csv`
      );
    });
  })();
});
