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

  document.getElementById('searchInput').addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    currentData = sortData(filterData(DATA, searchQuery), sortKey);
    renderTablePaged(currentData, searchQuery);
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
  let sSortKey = 'bruto';
  let sQuery   = '';
  const renderSalaryPaged = withPaging(renderSalary, 'vmSalarios', 'Ver todos os 493 servidores');
  renderSalaryPaged(sortSalary(SALARY_DATA, sSortKey));

  document.getElementById('salarySearch').addEventListener('input', e => {
    sQuery = e.target.value.trim();
    renderSalaryPaged(sortSalary(filterSalary(SALARY_DATA, sQuery), sSortKey), sQuery);
  });

  const salarySortSel = document.getElementById('salarySortSelect');
  salarySortSel.addEventListener('change', () => {
    sSortKey = salarySortSel.value;
    renderSalaryPaged(sortSalary(filterSalary(SALARY_DATA, sQuery), sSortKey), sQuery);
    updateSortHeader('.salary-table', sSortKey, { bruto: 5, liq: 7 }, 'sorted-sal');
  });

  document.querySelectorAll('th[data-ssort]').forEach(th => {
    th.addEventListener('click', () => {
      salarySortSel.value = th.dataset.ssort;
      salarySortSel.dispatchEvent(new Event('change'));
    });
  });

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
    const refresh = () => renderEmpPaged(getFiltered(), empQuery);

    filtersEl.addEventListener('click', e => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      filtersEl.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCat = btn.dataset.cat;
      refresh();
    });

    const empSearchEl = document.getElementById('empSearch');
    if (empSearchEl) empSearchEl.addEventListener('input', e => { empQuery = e.target.value; refresh(); });

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
});
