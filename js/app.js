function fmtSal(n) {
  return 'R$ ' + n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
}

function renderSalary(data, query = '', limit = Infinity) {
  const tbody = document.getElementById('salaryBody');
  const empty = document.getElementById('salaryEmpty');
  const counter = document.getElementById('salaryCount');

  function hl(text, q) {
    if (!q) return text;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return text.replace(re, '<mark>$1</mark>');
  }

  if (data.length === 0) {
    tbody.innerHTML = '';
    empty.classList.add('visible');
    counter.innerHTML = '<strong>0</strong> servidores';
    return;
  }

  empty.classList.remove('visible');
  counter.innerHTML = `<strong>${data.length}</strong> servidor${data.length !== 1 ? 'es' : ''}`;

  tbody.innerHTML = salSlice.map((d, i) => {
    const liq = d.bruto - d.deducoes;
    const barW = (d.bruto / SALARY_MAX * 100).toFixed(1);
    const area = AREA_MAP[d.area] || { label: 'Outros', cls: 'tag-outros' };

    let rankHtml;
    if (i < 3) {
      rankHtml = `<span class="rank-top rank-${i+1}">${i+1}</span>`;
    } else {
      rankHtml = `${i+1}`;
    }

    const nomeHl = hl(d.nome, query);
    const cargoHl = hl(d.cargo, query);
    const rescisaoTag = d.tipo === 'Rescisão'
      ? `<span class="s-cargo-tag tag-rescisao" title="Verbas rescisórias — não representa salário mensal regular">Rescisão</span> `
      : '';

    return `<tr class="fade-row" style="animation-delay:${Math.min(i * 0.025, 0.5)}s">
      <td class="td-rank">${rankHtml}</td>
      <td class="td-name">
        <div class="s-name">${nomeHl}</div>
        <div class="s-mat">Mat. confidencial</div>
      </td>
      <td>
        ${rescisaoTag}<span class="s-cargo-tag ${area.cls}">${area.label}</span>
        <div class="s-cargo-name">${cargoHl}</div>
        <div class="salary-bar-track">
          <div class="salary-bar-fill" style="width:${barW}%" data-sw="${barW}"></div>
        </div>
      </td>
      <td class="s-secretaria">${d.secretaria}</td>
      <td class="val-bruto">${fmtSal(d.bruto)}</td>
      <td class="val-dedu">-${fmtSal(d.deducoes)}</td>
      <td class="val-liq">${fmtSal(liq)}</td>
    </tr>`;
  }).join('');

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.salary-bar-fill').forEach(el => {
        el.style.transform = `scaleX(${parseFloat(el.dataset.sw) / 100})`;
      });
    });
  });
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
  const lq = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  return data.filter(d => {
    const n = (d.nome + ' ' + d.cargo + ' ' + d.secretaria).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    return n.includes(lq);
  });
}
// Classify entity type
function classifyEntity(nome) {
  const n = nome.toLowerCase();
  if (n.includes('folha') || n.includes('pagamento')) return { label: 'Folha', cls: 'tag-pref' };
  if (n.includes('banco') || n.includes('bradesco') || n.includes('caixa') || n.includes('sicredi') || n.includes('sicob')) return { label: 'Banco', cls: 'tag-banco' };
  if (n.includes('inss') || n.includes('seguro social') || n.includes('previd') || n.includes('ipmd')) return { label: 'Previdência', cls: 'tag-gov' };
  if (n.includes('receita federal') || n.includes('fazenda') || n.includes('tribunal') || n.includes('seg. pública') || n.includes('segurança pública') || n.includes('prodesp') || n.includes('secretaria')) return { label: 'Gov. Estadual/Fed.', cls: 'tag-gov' };
  if (n.includes('transport') || n.includes('transer') || n.includes('caique')) return { label: 'Transporte', cls: 'tag-tran' };
  if (n.includes('farmac') || n.includes('hospitalar') || n.includes('medic') || n.includes('saúde') || n.includes('saude') || n.includes('mastolog') || n.includes('fonoudiolog') || n.includes('jaboque') || n.includes('nutric') || n.includes('gente segur')) return { label: 'Saúde', cls: 'tag-saude' };
  if (n.includes('escola') || n.includes('ciee') || n.includes('integração') || n.includes('integra') || n.includes('inepa') || n.includes('pesquisa')) return { label: 'Educação', cls: 'tag-edu' };
  if (n.includes('lar da') || n.includes('lar de') || n.includes('gente amiga') || n.includes('osc') || n.includes('são vicente')) return { label: 'ONG/Social', cls: 'tag-ong' };
  if (n.includes('cpfl') || n.includes('sabesp') || n.includes('vivo') || n.includes('telefon') || n.includes('telecomunic') || n.includes('fb telec')) return { label: 'Serviços Públicos', cls: 'tag-serv' };
  return { label: 'Outros', cls: 'tag-outros' };
}

// Parse BR currency to number
function parseVal(s) {
  if (!s || s === 'R$ 0,00') return 0;
  return parseFloat(s.replace('R$ ','').replace(/\./g,'').replace(',','.')) || 0;
}

// Format BR currency
function fmtBR(n) {
  return 'R$ ' + n.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ── RENDER TABLE ──────────────────────────────────────
let currentData = [...DATA];
let sortKey = 'emp';
let searchQuery = '';

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
  document.getElementById('resultCount').innerHTML = `<strong>${data.length}</strong> resultado${data.length !== 1 ? 's' : ''}`;
  const slice = limit < Infinity ? data.slice(0, limit) : data;

  function hl(text, q) {
    if (!q) return text;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')})`, 'gi');
    return text.replace(re, '<mark>$1</mark>');
  }

  const salSlice = limit < Infinity ? data.slice(0, limit) : data;
  tbody.innerHTML = salSlice.map((d, i) => {
    const pct = d.valor_num > 0 ? (parseVal(d.pago) / d.valor_num * 100) : 0;
    const barW = (d.valor_num / MAX_VAL * 100).toFixed(1);
    const barCls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
    const ent = classifyEntity(d.nome);

    let rankHtml;
    if (i < 3) {
      rankHtml = `<span class="rank-top rank-${i+1}">${i+1}</span>`;
    } else {
      rankHtml = `${i+1}`;
    }

    let pctCls = 'pct-zero';
    if (pct >= 75) pctCls = 'pct-high';
    else if (pct >= 40) pctCls = 'pct-mid';
    else if (pct > 0) pctCls = 'pct-low';

    const nomeHl = hl(d.nome, query);
    const cnpjHl = hl(d.cnpj, query);

    return `<tr class="fade-row" style="animation-delay:${Math.min(i * 0.025, 0.5)}s">
      <td class="td-rank">${rankHtml}</td>
      <td class="td-name">
        <div class="entity-name">${nomeHl}</div>
        <span class="type-tag ${ent.cls}">${ent.label}</span>
      </td>
      <td class="td-cnpj">${cnpjHl}</td>
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

  // Animate bars after render
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.bar-fill').forEach(el => {
        el.style.transform = `scaleX(${parseFloat(el.dataset.w) / 100})`;
      });
    });
  });
}

// ── SORT ──────────────────────────────────────────────
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

// ── FILTER ────────────────────────────────────────────
function filterData(data, q) {
  if (!q) return data;
  const lq = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  return data.filter(d => {
    const n = d.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
    const c = d.cnpj.toLowerCase();
    return n.includes(lq) || c.includes(lq);
  });
}

// ── STATS ─────────────────────────────────────────────
function updateStats() {
  const totalEmp  = DATA.reduce((s, d) => s + d.valor_num, 0);
  const totalPago = DATA.reduce((s, d) => s + parseVal(d.pago), 0);
  const pct = totalPago / totalEmp * 100;

  const fmt = (n) => {
    if (n >= 1e6) return 'R$ ' + (n/1e6).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) + ' M';
    return fmtBR(n);
  };

  document.getElementById('stat-emp').textContent   = fmt(totalEmp);
  document.getElementById('stat-pago').textContent  = fmt(totalPago);
  document.getElementById('stat-pct').textContent   = pct.toFixed(1) + '%';
  document.getElementById('stat-count').textContent = DATA.length;
}

// ── INIT ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // ── PAGINAÇÃO 10 ITENS ────────────────────────────────────────────────────
  function withPaging(renderFn, btnId, label) {
    // renderFn(data, query, limit) renders up to `limit` rows
    // returns a wrapped function that shows PAGE_SIZE rows and wires the button
    return function(data, query) {
      const btn = document.getElementById(btnId);
      const isExpanded = btn && btn.dataset.expanded === '1';
      const limit = isExpanded ? Infinity : PAGE_SIZE;
      renderFn(data, query, limit);
      if (btn) {
        if (!data || data.length <= PAGE_SIZE || isExpanded) {
          btn.classList.add('hidden');
        } else {
          btn.classList.remove('hidden');
          btn.textContent = label + ' ↓';
          btn.onclick = function() {
            btn.dataset.expanded = '1';
            renderFn(data, query, Infinity);
            btn.classList.add('hidden');
          };
        }
      }
    };
  }


  updateStats();

  const renderTablePaged = withPaging(renderTable, 'vmCredores', 'Ver todos os 50 credores');
  currentData = sortData(DATA, sortKey);
  renderTablePaged(currentData, searchQuery);

  // Search
  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput.value.trim();
    const filtered = filterData(DATA, searchQuery);
    currentData = sortData(filtered, sortKey);
    renderTablePaged(currentData, searchQuery);
  });

  // Sort select
  const sortSelect = document.getElementById('sortSelect');
  sortSelect.addEventListener('change', () => {
    sortKey = sortSelect.value;
    currentData = sortData(filterData(DATA, searchQuery), sortKey);
    renderTablePaged(currentData, searchQuery);

    // Update header highlight
    document.querySelectorAll('.data-table thead th').forEach(th => {
      th.classList.remove('sorted');
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = '↕';
    });
    const colMap = { emp: 5, pago: 6, pct: 7 };
    if (sortKey !== 'nome') {
      const idx = colMap[sortKey];
      const ths = document.querySelectorAll('.data-table thead th');
      if (ths[idx - 1]) {
        ths[idx - 1].classList.add('sorted');
        const icon = ths[idx - 1].querySelector('.sort-icon');
        if (icon) icon.textContent = '↓';
      }
    }
  });

  // Column header sort
  document.querySelectorAll('th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      sortSelect.value = key;
      sortSelect.dispatchEvent(new Event('change'));
    });
  });

  // ── SALARY TABLE INIT ──────────────────────────────
  let sSortKey = 'bruto';
  let sQuery = '';

  const renderSalaryPaged = withPaging(renderSalary, 'vmSalarios', 'Ver todos os 493 servidores');
  renderSalaryPaged(sortSalary(SALARY_DATA, sSortKey));

  const salarySearch = document.getElementById('salarySearch');
  salarySearch.addEventListener('input', () => {
    sQuery = salarySearch.value.trim();
    renderSalaryPaged(sortSalary(filterSalary(SALARY_DATA, sQuery), sSortKey), sQuery);
  });

  const salarySortSel = document.getElementById('salarySortSelect');
  salarySortSel.addEventListener('change', () => {
    sSortKey = salarySortSel.value;
    renderSalaryPaged(sortSalary(filterSalary(SALARY_DATA, sQuery), sSortKey), sQuery);

    document.querySelectorAll('.salary-table thead th').forEach(th => {
      th.classList.remove('sorted-sal');
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = '↕';
    });
    const sColMap = { bruto: 5, liq: 7 };
    if (sSortKey !== 'nome') {
      const idx = sColMap[sSortKey];
      const ths = document.querySelectorAll('.salary-table thead th');
      if (ths[idx - 1]) {
        ths[idx - 1].classList.add('sorted-sal');
        const icon = ths[idx - 1].querySelector('.sort-icon');
        if (icon) icon.textContent = '↓';
      }
    }
  });

  document.querySelectorAll('th[data-ssort]').forEach(th => {
    th.addEventListener('click', () => {
      salarySortSel.value = th.dataset.ssort;
      salarySortSel.dispatchEvent(new Event('change'));
    });
  });

  // ── EMPENHOS ────────────────────────────────────────────────────────────
  function fmtBRL(n) {
    return 'R$ ' + n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  }

  function truncate(s, n) {
    if (!s) return '';
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  function renderEmpenhos(data, query, limit = Infinity) {
    const body = document.getElementById('empBody');
    const empty = document.getElementById('empEmpty');
    const count = document.getElementById('empCount');
    if (!body) return;

    const q = (query || '').toLowerCase().trim();
    const filtered = q
      ? data.filter(d =>
          (d.credor || '').toLowerCase().includes(q) ||
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

    const empSlice = limit < Infinity ? filtered.slice(0, limit) : filtered;
    body.innerHTML = empSlice.map(d => {
      const catCls = CAT_CLASS[d.categoria] || 'cat-outros';
      const desc = truncate(d.descricao || d.credor, 120);
      const sourceTag = d.fonte && d.fonte.includes('Restos')
        ? `<span style="font-size:0.6rem;color:#888;display:block;margin-top:2px;">Restos a Pagar 2025</span>` : '';
      return `<tr>
        <td><span class="emp-cat-badge ${catCls}">${d.categoria}</span></td>
        <td class="td-credor" title="${d.credor}">${truncate(d.credor, 35)}</td>
        <td class="td-desc" title="${d.descricao}">${desc}${sourceTag}</td>
        <td class="td-val">${fmtBRL(d.valor)}</td>
      </tr>`;
    }).join('');
  }

  // Empenhos inline data (atualizado em 21/05/2026)
  (function initEmpenhos() {
    const cats = [...new Set(EMPENHOS_DATA.map(d => d.categoria))].sort();
    const filtersEl = document.getElementById('catFilters');
    if (!filtersEl) return;
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      filtersEl.appendChild(btn);
    });

    let activeCat = '';
    let empQuery = '';

    function getFiltered() {
      return activeCat ? EMPENHOS_DATA.filter(d => d.categoria === activeCat) : EMPENHOS_DATA;
    }

    const renderEmpPaged = withPaging(renderEmpenhos, 'vmEmpenhos', 'Ver todos os empenhos');
    function refresh() { renderEmpPaged(getFiltered(), empQuery); }

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
      empSearchEl.addEventListener('input', () => { empQuery = empSearchEl.value; refresh(); });
    }

    refresh();
  })();

  // ── DIÁRIAS E VIAGENS ─────────────────────────────────────────────────────
(function initDiarias() {
    const d = DIARIAS_DATA;
    function fmtBRL(n) { return 'R$ ' + n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}); }

    const stats = document.getElementById('diariasStats');
    if (stats) {
      stats.innerHTML = [
        { val: fmtBRL(d.total_gasto), lbl: 'Total gasto' },
        { val: d.total_empenhos,      lbl: 'Adiantamentos' },
        { val: d.total_pessoas,       lbl: 'Pessoas' },
      ].map(s => '<div class="diaria-stat"><span class="ds-val">' + s.val + '</span><span class="ds-lbl">' + s.lbl + '</span></div>').join('');
    }

    const barsEl = document.getElementById('pessoaBars');
    if (barsEl) {
      const maxVal = d.por_pessoa[0].total;
      barsEl.innerHTML = d.por_pessoa.map(function(p) {
        const pct = (p.total / maxVal * 100).toFixed(1);
        return '<div class="pessoa-bar-row">' +
          '<span class="pessoa-bar-nome" title="' + p.nome + ' — ' + p.secretaria + '">' + p.nome + '</span>' +
          '<div class="pessoa-bar-track"><div class="pessoa-bar-fill" style="width:0" data-w="' + pct + '"></div></div>' +
          '<span class="pessoa-bar-val">' + fmtBRL(p.total) + '</span>' +
          '<span class="pessoa-bar-count">' + p.viagens + ' viagem' + (p.viagens > 1 ? 's' : '') + '</span>' +
          '</div>';
      }).join('');
      requestAnimationFrame(function() { requestAnimationFrame(function() {
        document.querySelectorAll('.pessoa-bar-fill').forEach(function(el) { el.style.width = el.dataset.w + '%'; });
      }); });
    }

    const tbody = document.getElementById('viagensBody');
    if (tbody) {
      tbody.innerHTML = d.detalhes.map(function(r) {
        return '<tr>' +
          '<td class="v-data">' + r.data + '</td>' +
          '<td><div class="v-nome">' + r.nome + '</div><div class="v-sec">' + r.secretaria + '</div></td>' +
          '<td class="v-desc">' + (r.descricao || '—') + '</td>' +
          '<td class="v-val">' + fmtBRL(r.valor) + '</td>' +
          '</tr>';
      }).join('');
    }
  })();

});
