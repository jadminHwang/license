/**
 * 자격증 나침반 - app.js
 * 한국산업인력공단 국가기술자격 API 연동
 */

// ====== API 설정 ======
const API_CONFIG = {
  serviceKey: 'Ni8NA6JQYRglvzf8xZsvJGu3lSse17t5roa%2B5FQCiD0gWCh4wPz8kGMfwOXJHyo%2Bzsp0x7YrErhalvLWX09lSg%3D%3D',
  baseUrl: 'http://openapi.q-net.or.kr/api/service/rest/InquiryTestInformationNTQSVC',
  // CORS 프록시 (브라우저에서 직접 호출 시 필요)
  corsProxy: 'https://corsproxy.io/?',
  endpoints: {
    pe: 'getPEList',    // 기술사
    mc: 'getMCList',   // 기능장
    e: 'getEList',    // 기사/산업기사
    c: 'getCList',    // 기능사
    fee: 'getFeeList', // 응시수수료
    jm: 'getJMList',   // 종목별 시행일정
  }
};

// ====== 인기 종목 데이터 (2024 통계 기반) ======
const POPULAR_QUALIFICATIONS = [
  { rank: 1, name: '컴퓨터활용능력 2급', grade: '기능사급', applicants: 437698, api: 'c', color: '#ff6b8a' },
  { rank: 2, name: '컴퓨터활용능력 1급', grade: '기사급', applicants: 429867, api: 'e', color: '#ffd700' },
  { rank: 3, name: '지게차운전기능사', grade: '기능사', applicants: 270832, api: 'c', color: '#cd7f32' },
  { rank: 4, name: '산업안전기사', grade: '기사', applicants: 196411, api: 'e', color: '#5b7fff' },
  { rank: 5, name: '정보처리기사', grade: '기사', applicants: 187548, api: 'e', color: '#00c2ff' },
  { rank: 6, name: '한식조리기능사', grade: '기능사', applicants: 133791, api: 'c', color: '#22d3a4' },
  { rank: 7, name: '굴착기운전기능사', grade: '기능사', applicants: 121505, api: 'c', color: '#ff9f43' },
  { rank: 8, name: '전기기능사', grade: '기능사', applicants: 109686, api: 'c', color: '#a29bfe' },
  { rank: 9, name: '전기기사', grade: '기사', applicants: 109488, api: 'e', color: '#fd79a8' },
  { rank: 10, name: '제과기능사', grade: '기능사', applicants: 98413, api: 'c', color: '#fdcb6e' },
];

// ====== 수수료 데이터 (2026 기준 - API 응답 보완) ======
const FEE_DATA = [
  {
    type: 'pe',
    title: '기술사',
    label: '기술사 등급',
    docFee: '67,800원',
    pracFee: '87,400원 (구술시험)',
    note: '응시수수료는 변경될 수 있습니다.'
  },
  {
    type: 'mc',
    title: '기능장',
    label: '기능장 등급',
    docFee: '19,400원',
    pracFee: '실기 종목별 상이',
    note: '종목에 따라 실기 수수료 다름'
  },
  {
    type: 'e',
    title: '기사 / 산업기사',
    label: '기사·산업기사 등급',
    docFee: '19,400원',
    pracFee: '종목별 상이 (약 20,800~34,600원)',
    note: '산업기사 필기: 19,400원'
  },
  {
    type: 'c',
    title: '기능사',
    label: '기능사 등급',
    docFee: '14,500원',
    pracFee: '종목별 상이 (약 17,200~34,900원)',
    note: '가장 많은 응시자, 접근성 높음'
  },
];

// ====== 캐시 ======
const cache = {};

// ====== 유틸리티 ======
function formatDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return '-';
  return `${dateStr.substring(0, 4)}.${dateStr.substring(4, 6)}.${dateStr.substring(6, 8)}`;
}

function getDday(dateStr) {
  if (!dateStr || dateStr.length !== 8) return null;
  const target = new Date(
    parseInt(dateStr.substring(0, 4)),
    parseInt(dateStr.substring(4, 6)) - 1,
    parseInt(dateStr.substring(6, 8))
  );
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.floor((target - today) / (1000 * 60 * 60 * 24));
  return diff;
}

function getDdayText(dateStr) {
  const d = getDday(dateStr);
  if (d === null) return '';
  if (d < 0) return '';
  if (d === 0) return 'D-DAY';
  return `D-${d}`;
}

function getDdayClass(dateStr) {
  const d = getDday(dateStr);
  if (d === null) return 'dday-past';
  if (d < 0) return 'dday-past';
  if (d <= 7) return 'dday-soon';
  return 'dday-upcoming';
}

function numToComma(n) {
  return n.toLocaleString('ko-KR');
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

// ====== API 호출 ======
async function fetchSchedule(gradeKey) {
  if (cache[gradeKey]) return cache[gradeKey];

  const endpoint = API_CONFIG.endpoints[gradeKey];
  const directUrl = `${API_CONFIG.baseUrl}/${endpoint}?serviceKey=${API_CONFIG.serviceKey}`;
  const proxyUrl = `${API_CONFIG.corsProxy}${encodeURIComponent(directUrl)}`;

  let xmlText = null;

  // 1차 시도: 직접 호출
  try {
    const res = await fetch(directUrl, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      xmlText = await res.text();
    }
  } catch (e) {
    // 직접 호출 실패, 프록시 시도
  }

  // 2차 시도: CORS 프록시
  if (!xmlText) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        xmlText = await res.text();
      }
    } catch (e) {
      // 프록시도 실패
    }
  }

  if (!xmlText) throw new Error('API 호출 실패');

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

  const resultCode = xmlDoc.querySelector('resultCode')?.textContent;
  if (resultCode !== '00') {
    throw new Error(`API 오류 코드: ${resultCode}`);
  }

  const items = Array.from(xmlDoc.querySelectorAll('item'));
  const data = items.map(item => ({
    description: item.querySelector('description')?.textContent || '',
    docRegStartDt: item.querySelector('docregstartdt')?.textContent || '',
    docRegEndDt: item.querySelector('docregenddt')?.textContent || '',
    docExamDt: item.querySelector('docexamdt')?.textContent || '',
    docPassDt: item.querySelector('docpassdt')?.textContent || '',
    docSubmitStartDt: item.querySelector('docsubmitstartdt')?.textContent || '',
    docSubmitEndDt: item.querySelector('docsubmitentdt')?.textContent || '',
    pracRegStartDt: item.querySelector('pracregstartdt')?.textContent || '',
    pracRegEndDt: item.querySelector('pracregenddt')?.textContent || '',
    pracExamStartDt: item.querySelector('pracexamstartdt')?.textContent || '',
    pracExamEndDt: item.querySelector('pracexamenddt')?.textContent || '',
    pracPassDt: item.querySelector('pracpassdt')?.textContent || '',
  }));

  // 중복 제거 (description 기준)
  const unique = data.reduce((acc, cur) => {
    const key = `${cur.description}_${cur.pracRegStartDt}`;
    if (!acc.find(i => `${i.description}_${i.pracRegStartDt}` === key)) {
      acc.push(cur);
    }
    return acc;
  }, []);

  cache[gradeKey] = unique;
  return unique;
}

// ====== 시험 일정 카드 생성 ======
function createScheduleCard(item, gradeKey) {
  const gradeLabels = {
    pe: { text: '기술사', cls: 'label-pe', emoji: '🏅' },
    mc: { text: '기능장', cls: 'label-mc', emoji: '⭐' },
    e: { text: '기사/산업기사', cls: 'label-e', emoji: '📘' },
    c: { text: '기능사', cls: 'label-c', emoji: '📗' },
  };

  const grade = gradeLabels[gradeKey] || gradeLabels.e;

  const scheduleRows = [
    {
      label: '필기 원서접수', dot: 'dot-blue',
      date: item.docRegStartDt && item.docRegEndDt
        ? `${formatDate(item.docRegStartDt)} ~ ${formatDate(item.docRegEndDt)}`
        : '-',
      ddayTarget: item.docRegStartDt
    },
    {
      label: '필기 시험일', dot: 'dot-orange',
      date: formatDate(item.docExamDt),
      ddayTarget: item.docExamDt
    },
    {
      label: '필기 합격발표', dot: 'dot-green',
      date: formatDate(item.docPassDt),
      ddayTarget: item.docPassDt
    },
    {
      label: '실기 원서접수', dot: 'dot-blue',
      date: item.pracRegStartDt && item.pracRegEndDt
        ? `${formatDate(item.pracRegStartDt)} ~ ${formatDate(item.pracRegEndDt)}`
        : '-',
      ddayTarget: item.pracRegStartDt
    },
    {
      label: '실기 시험', dot: 'dot-orange',
      date: item.pracExamStartDt && item.pracExamEndDt
        ? `${formatDate(item.pracExamStartDt)} ~ ${formatDate(item.pracExamEndDt)}`
        : '-',
      ddayTarget: item.pracExamStartDt
    },
    {
      label: '최종 합격발표', dot: 'dot-green',
      date: formatDate(item.pracPassDt),
      ddayTarget: item.pracPassDt
    },
  ];

  const rowsHTML = scheduleRows.map(r => {
    const ddayText = getDdayText(r.ddayTarget);
    const ddayCls = getDdayClass(r.ddayTarget);
    const badge = ddayText ? `<span class="dday-badge ${ddayCls}">${ddayText}</span>` : '';
    return `
      <div class="schedule-item">
        <div class="schedule-item-label">
          <span class="dot ${r.dot}"></span>
          ${r.label}
        </div>
        <div class="schedule-item-date">${r.date}${badge}</div>
      </div>
    `;
  }).join('');

  const div = document.createElement('div');
  div.className = 'schedule-card';
  div.setAttribute('data-grade', gradeKey);
  div.innerHTML = `
    <div class="card-label ${grade.cls}">${grade.emoji} ${grade.text}</div>
    <div class="card-title">${item.description}</div>
    <div class="schedule-list">${rowsHTML}</div>
  `;

  div.addEventListener('click', () => openModal(item, gradeKey));
  return div;
}

// ====== 시험 일정 로드 ======
let currentGrade = 'pe';

async function loadSchedule(gradeKey) {
  currentGrade = gradeKey;

  const grid = document.getElementById('schedule-grid');
  const loading = document.getElementById('schedule-loading');
  const error = document.getElementById('schedule-error');

  grid.innerHTML = '';
  grid.style.display = 'none';
  error.style.display = 'none';
  loading.style.display = 'flex';

  try {
    const data = await fetchSchedule(gradeKey);

    loading.style.display = 'none';
    grid.style.display = 'grid';

    if (!data || data.length === 0) {
      grid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--color-text2);">
          <div style="font-size:3rem;margin-bottom:1rem;">🗓️</div>
          <p>현재 등록된 시험 일정이 없습니다.</p>
        </div>`;
      return;
    }

    data.forEach(item => {
      grid.appendChild(createScheduleCard(item, gradeKey));
    });

    // D-Day 섹션도 업데이트
    renderDday(data, gradeKey);

  } catch (err) {
    loading.style.display = 'none';
    error.style.display = 'flex';
    document.getElementById('schedule-error-msg').textContent =
      `데이터를 불러오지 못했습니다. (${err.message})`;

    // 더미 데이터로 fallback
    loadDemoData(gradeKey);
  }
}

// ====== 더미 데이터 (API 실패 시 fallback) ======
function loadDemoData(gradeKey) {
  const error = document.getElementById('schedule-error');
  const grid = document.getElementById('schedule-grid');

  const demoData = {
    pe: [
      {
        description: '기술사(2026년도 제138회)',
        docRegStartDt: '20260106', docRegEndDt: '20260109',
        docExamDt: '20260207', docPassDt: '20260325',
        docSubmitStartDt: '20260209', docSubmitEndDt: '20260403',
        pracRegStartDt: '20260330', pracRegEndDt: '20260402',
        pracExamStartDt: '20260502', pracExamEndDt: '20260516',
        pracPassDt: '20260529',
      },
      {
        description: '기술사(2026년도 제139회)',
        docRegStartDt: '20260601', docRegEndDt: '20260605',
        docExamDt: '20260718', docPassDt: '20260829',
        docSubmitStartDt: '20260722', docSubmitEndDt: '20260912',
        pracRegStartDt: '20260907', pracRegEndDt: '20260910',
        pracExamStartDt: '20261017', pracExamEndDt: '20261031',
        pracPassDt: '20261114',
      }
    ],
    mc: [
      {
        description: '기능장(2026년도 제68회)',
        docRegStartDt: '20260113', docRegEndDt: '20260116',
        docExamDt: '20260222', docPassDt: '20260328',
        docSubmitStartDt: '20260302', docSubmitEndDt: '20260408',
        pracRegStartDt: '20260404', pracRegEndDt: '20260407',
        pracExamStartDt: '20260518', pracExamEndDt: '20260529',
        pracPassDt: '20260618',
      }
    ],
    e: [
      {
        description: '기사(2026년도 제1회)',
        docRegStartDt: '20260113', docRegEndDt: '20260116',
        docExamDt: '20260301', docPassDt: '20260315',
        docSubmitStartDt: '', docSubmitEndDt: '',
        pracRegStartDt: '20260317', pracRegEndDt: '20260320',
        pracExamStartDt: '20260413', pracExamEndDt: '20260509',
        pracPassDt: '20260529',
      },
      {
        description: '기사(2026년도 제2회)',
        docRegStartDt: '20260505', docRegEndDt: '20260508',
        docExamDt: '20260614', docPassDt: '20260628',
        docSubmitStartDt: '', docSubmitEndDt: '',
        pracRegStartDt: '20260629', pracRegEndDt: '20260702',
        pracExamStartDt: '20260720', pracExamEndDt: '20260830',
        pracPassDt: '20260919',
      },
      {
        description: '기사(2026년도 제3회)',
        docRegStartDt: '20260818', docRegEndDt: '20260821',
        docExamDt: '20261004', docPassDt: '20261018',
        docSubmitStartDt: '', docSubmitEndDt: '',
        pracRegStartDt: '20261020', pracRegEndDt: '20261023',
        pracExamStartDt: '20261109', pracExamEndDt: '20261205',
        pracPassDt: '20261224',
      },
    ],
    c: [
      {
        description: '기능사(2026년도 제1회)',
        docRegStartDt: '20260106', docRegEndDt: '20260109',
        docExamDt: '20260201', docPassDt: '20260220',
        docSubmitStartDt: '', docSubmitEndDt: '',
        pracRegStartDt: '20260223', pracRegEndDt: '20260226',
        pracExamStartDt: '20260330', pracExamEndDt: '20260417',
        pracPassDt: '20260507',
      },
      {
        description: '기능사(2026년도 제2회)',
        docRegStartDt: '20260324', docRegEndDt: '20260327',
        docExamDt: '20260503', docPassDt: '20260522',
        docSubmitStartDt: '', docSubmitEndDt: '',
        pracRegStartDt: '20260525', pracRegEndDt: '20260528',
        pracExamStartDt: '20260623', pracExamEndDt: '20260711',
        pracPassDt: '20260731',
      },
      {
        description: '기능사(2026년도 제3회)',
        docRegStartDt: '20260609', docRegEndDt: '20260612',
        docExamDt: '20260712', docPassDt: '20260731',
        docSubmitStartDt: '', docSubmitEndDt: '',
        pracRegStartDt: '20260803', pracRegEndDt: '20260806',
        pracExamStartDt: '20260907', pracExamEndDt: '20260925',
        pracPassDt: '20261015',
      },
      {
        description: '기능사(2026년도 제4회)',
        docRegStartDt: '20260901', docRegEndDt: '20260904',
        docExamDt: '20261004', docPassDt: '20261023',
        docSubmitStartDt: '', docSubmitEndDt: '',
        pracRegStartDt: '20261027', pracRegEndDt: '20261030',
        pracExamStartDt: '20261124', pracExamEndDt: '20261211',
        pracPassDt: '20261230',
      },
    ]
  };

  const data = demoData[gradeKey] || [];
  cache[gradeKey] = data;

  error.style.display = 'none';
  grid.style.display = 'grid';
  grid.innerHTML = '';

  if (data.length === 0) return;

  data.forEach(item => {
    grid.appendChild(createScheduleCard(item, gradeKey));
  });

  renderDday(data, gradeKey);
  showToast('⚠️ API 연결 실패 - 예시 데이터로 표시됩니다');
}

// ====== D-Day 섹션 ======
function renderDday(data, gradeKey) {
  const gradeNames = { pe: '기술사', mc: '기능장', e: '기사/산업기사', c: '기능사' };
  const gradeName = gradeNames[gradeKey] || '';
  const grid = document.getElementById('dday-grid');

  // 다음으로 예정된 시험에서 D-Day 항목 추출
  const events = [];
  data.forEach(item => {
    const checks = [
      { label: '필기 원서접수 시작', date: item.docRegStartDt, desc: item.description },
      { label: '필기 시험일', date: item.docExamDt, desc: item.description },
      { label: '필기 합격발표', date: item.docPassDt, desc: item.description },
      { label: '실기 원서접수 시작', date: item.pracRegStartDt, desc: item.description },
      { label: '실기 시험 시작', date: item.pracExamStartDt, desc: item.description },
      { label: '최종 합격발표', date: item.pracPassDt, desc: item.description },
    ];
    checks.forEach(c => {
      const d = getDday(c.date);
      if (d !== null && d >= 0) events.push({ ...c, dday: d });
    });
  });

  events.sort((a, b) => a.dday - b.dday);
  const topEvents = events.slice(0, 6);

  if (topEvents.length === 0) return;

  const newCards = topEvents.map(ev => {
    const ddayClass = ev.dday === 0 ? 'dday-zero' : ev.dday <= 7 ? 'dday-positive' : 'dday-positive';
    const ddayText = ev.dday === 0 ? 'D-DAY!' : `D-${ev.dday}`;
    return `
      <div class="dday-card">
        <div class="dday-label">${gradeName} ${ev.label}</div>
        <div class="dday-event">${ev.desc}</div>
        <div class="dday-number ${ddayClass}">${ddayText}</div>
        <div class="dday-date">${formatDate(ev.date)}</div>
      </div>
    `;
  }).join('');

  // 기존 카드 업데이트
  grid.innerHTML = newCards;
}

// ====== 인기 종목 렌더링 ======
function renderPopular() {
  const grid = document.getElementById('popular-grid');
  const maxApp = POPULAR_QUALIFICATIONS[0].applicants;

  grid.innerHTML = POPULAR_QUALIFICATIONS.map(q => {
    const rankClass = q.rank === 1 ? 'rank-1' : q.rank === 2 ? 'rank-2' : q.rank === 3 ? 'rank-3' : 'rank-other';
    const barWidth = Math.round((q.applicants / maxApp) * 100);

    return `
      <div class="popular-card" id="popular-card-${q.rank}" data-name="${q.name}" data-api="${q.api}">
        <div class="rank-badge ${rankClass}">${q.rank}</div>
        <div class="popular-info">
          <div class="popular-name">${q.name}</div>
          <span class="popular-grade">${q.grade}</span>
          <div class="popular-applicants">
            2024 응시자: <strong>${numToComma(q.applicants)}명</strong>
          </div>
        </div>
        <div class="popular-bar-wrap">
          <div class="popular-bar" style="width: 0%" data-width="${barWidth}"></div>
        </div>
      </div>
    `;
  }).join('');

  // 클릭 이벤트
  grid.querySelectorAll('.popular-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.name;
      const api = card.dataset.api;
      searchQualification(name, api);
    });
  });

  // 막대 애니메이션
  setTimeout(() => {
    grid.querySelectorAll('.popular-bar').forEach(bar => {
      bar.style.width = bar.dataset.width + '%';
    });
  }, 300);
}

// ====== 수수료 렌더링 ======
function renderFees() {
  const cards = document.getElementById('fee-cards');
  cards.innerHTML = FEE_DATA.map(f => `
    <div class="fee-card fee-${f.type}" id="fee-card-${f.type}">
      <div class="fee-card-title">${f.title}</div>
      <div class="fee-row">
        <div class="fee-row-label">📝 필기시험</div>
        <div class="fee-row-amount">${f.docFee}</div>
      </div>
      <div class="fee-row">
        <div class="fee-row-label">🔧 실기시험</div>
        <div class="fee-row-amount">${f.pracFee}</div>
      </div>
      <div class="fee-row" style="border-bottom:none;margin-top:0.25rem;">
        <div class="fee-row-label" style="font-size:0.75rem;color:var(--color-text3);">💡 ${f.note}</div>
      </div>
    </div>
  `).join('');
}

// ====== 검색 기능 ======
async function searchQualification(query, gradeHint = null) {
  if (!query.trim()) return;

  const section = document.getElementById('search-result-section');
  const grid = document.getElementById('search-result-grid');
  const queryText = document.getElementById('result-query-text');

  section.style.display = 'block';
  queryText.textContent = `"${query}"`;
  grid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:3rem;">
      <div class="spinner" style="margin:0 auto 1rem;"></div>
      <p style="color:var(--color-text2);">검색 중...</p>
    </div>`;

  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 해당 등급의 데이터 로드
  const gradesToSearch = gradeHint ? [gradeHint] : ['pe', 'mc', 'e', 'c'];
  const results = [];

  for (const grade of gradesToSearch) {
    try {
      if (!cache[grade]) {
        await loadSchedule(grade);
      }
      const data = cache[grade] || [];
      data.forEach(item => {
        results.push({ ...item, grade });
      });
    } catch (e) {
      // 캐시 없으면 스킵
    }
  }

  // 검색어 매칭 (현재 API는 종목명으로 필터링 어려우므로 설명 기준)
  const filtered = results.filter(r =>
    r.description && r.description.includes(query.replace(/\s+/g, ''))
  );

  grid.innerHTML = '';

  if (filtered.length === 0) {
    // 검색어로 종목별 API 시도
    await tryJMSearch(query, grid);
  } else {
    filtered.forEach(item => {
      grid.appendChild(createScheduleCard(item, item.grade));
    });
  }
}

async function tryJMSearch(query, grid) {
  const gradeNames = { pe: '기술사', mc: '기능장', e: '기사/산업기사', c: '기능사' };

  // 자격증 키워드 기반으로 등급 추정
  let targetGrade = 'e';
  if (/기능사/.test(query)) targetGrade = 'c';
  else if (/기능장/.test(query)) targetGrade = 'mc';
  else if (/기술사/.test(query)) targetGrade = 'pe';

  const data = cache[targetGrade] || [];

  if (data.length > 0) {
    // 등급 전체 일정 보여주기 (해당 등급의 자격증은 같은 일정)
    data.forEach(item => {
      const card = createScheduleCard(item, targetGrade);
      grid.appendChild(card);
    });

    const notice = document.createElement('div');
    notice.style.cssText = 'grid-column:1/-1;padding:1rem;background:rgba(91,127,255,0.08);border:1px solid rgba(91,127,255,0.2);border-radius:12px;color:var(--color-text2);font-size:0.85rem;';
    notice.innerHTML = `💡 <strong>"${query}"</strong>은(는) <strong>${gradeNames[targetGrade]}</strong> 등급입니다. 해당 등급의 시험 일정을 표시합니다. 종목별 정확한 일정은 <a href="https://www.q-net.or.kr" target="_blank" style="color:var(--color-primary-light);">Q-net</a>에서 확인하세요.`;
    grid.appendChild(notice);
  } else {
    grid.innerHTML = `
      <div class="no-result">
        <div class="no-result-icon">🔍</div>
        <h3 style="margin-bottom:0.5rem;color:var(--color-text);">"${document.getElementById('main-search-input').value}" 검색 결과 없음</h3>
        <p style="color:var(--color-text2);margin-bottom:1.5rem;">
          더 정확한 종목별 시험 일정은 Q-net에서 확인해 주세요.
        </p>
        <a href="https://www.q-net.or.kr" target="_blank"
           style="display:inline-block;background:linear-gradient(135deg,#5b7fff,#00c2ff);color:#fff;padding:0.7rem 1.5rem;border-radius:100px;text-decoration:none;font-weight:600;font-size:0.9rem;">
          Q-net 공식 사이트 바로가기
        </a>
      </div>
    `;
  }
}

// ====== 모달 ======
function openModal(item, gradeKey) {
  const gradeNames = { pe: '🏅 기술사', mc: '⭐ 기능장', e: '📘 기사/산업기사', c: '📗 기능사' };

  document.getElementById('modal-title').textContent = item.description;
  document.getElementById('modal-overlay').classList.add('open');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function timelineItemHTML(label, date, secondDate) {
    const d = getDday(date);
    const isDone = d !== null && d < 0;
    const isActive = d !== null && d >= 0 && d <= 3;
    const dotClass = isDone ? 'done' : isActive ? 'active' : '';

    const displayDate = secondDate
      ? `${formatDate(date)} ~ ${formatDate(secondDate)}`
      : formatDate(date);

    const ddayStr = d !== null && d >= 0
      ? `<span style="font-size:0.75rem;color:${d === 0 ? '#22d3a4' : '#7b9aff'};margin-left:0.5rem;">${d === 0 ? 'D-DAY' : `D-${d}`}</span>`
      : '';

    return `
      <div class="timeline-item">
        <div class="timeline-dot ${dotClass}"></div>
        <div class="timeline-content">
          <div class="timeline-label">${label}</div>
          <div class="timeline-date">${displayDate}${ddayStr}</div>
        </div>
      </div>
    `;
  }

  document.getElementById('modal-body').innerHTML = `
    <div class="modal-section">
      <div class="modal-section-title">📝 필기 시험 일정</div>
      <div class="modal-timeline">
        ${timelineItemHTML('원서접수', item.docRegStartDt, item.docRegEndDt)}
        ${timelineItemHTML('시험일', item.docExamDt)}
        ${timelineItemHTML('합격발표', item.docPassDt)}
        ${item.docSubmitStartDt ? timelineItemHTML('합격자 서류제출', item.docSubmitStartDt, item.docSubmitEndDt) : ''}
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">🔧 실기 시험 일정</div>
      <div class="modal-timeline">
        ${timelineItemHTML('원서접수', item.pracRegStartDt, item.pracRegEndDt)}
        ${timelineItemHTML('시험기간', item.pracExamStartDt, item.pracExamEndDt)}
        ${timelineItemHTML('최종 합격발표', item.pracPassDt)}
      </div>
    </div>
    <div style="margin-top:1.5rem;padding:1rem;background:rgba(91,127,255,0.07);border-radius:12px;font-size:0.82rem;color:var(--color-text2);">
      ⚠️ 시험 일정은 변경될 수 있습니다. 최종 확인은
      <a href="https://www.q-net.or.kr" target="_blank" style="color:var(--color-primary-light);text-decoration:none;">
        Q-net 공식 사이트
      </a>에서 하시기 바랍니다.
    </div>
  `;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// ====== 파티클 효과 ======
function createParticles() {
  const container = document.getElementById('particles');
  const colors = ['#5b7fff', '#00c2ff', '#ff6b8a', '#22d3a4', '#ffd700'];

  for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 4 + 2;
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 15 + 10}s;
      animation-delay: ${Math.random() * 8}s;
    `;
    container.appendChild(p);
  }
}

// ====== 스크롤 헤더 효과 ======
function setupScrollEffects() {
  const header = document.getElementById('header');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.style.background = 'rgba(12, 14, 26, 0.97)';
    } else {
      header.style.background = 'rgba(12, 14, 26, 0.85)';
    }
  });
}

// ====== 이벤트 바인딩 ======
function bindEvents() {
  // 검색
  document.getElementById('main-search-btn').addEventListener('click', () => {
    const q = document.getElementById('main-search-input').value.trim();
    if (q) searchQualification(q);
  });

  document.getElementById('main-search-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      if (q) searchQualification(q);
    }
  });

  // 인기 검색 태그
  document.querySelectorAll('.search-tag').forEach(tag => {
    tag.addEventListener('click', () => {
      const q = tag.dataset.query;
      document.getElementById('main-search-input').value = q;
      searchQualification(q);
    });
  });

  // 등급 탭
  document.querySelectorAll('.grade-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.grade-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      loadSchedule(tab.dataset.grade);
    });
  });

  // 재시도 버튼
  document.getElementById('schedule-retry-btn').addEventListener('click', () => {
    delete cache[currentGrade];
    loadSchedule(currentGrade);
  });

  // 모달 닫기
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

// ====== 전체 종목 데이터 (내장 fallback - 주요 200개) ======
const ALL_ITEMS_DATA = [
  // 기술사
  { name: '건설안전기술사', grade: '기술사', field: '안전·환경' },
  { name: '건설재료시험기술사', grade: '기술사', field: '건설·토목' },
  { name: '건축구조기술사', grade: '기술사', field: '건설·토목' },
  { name: '건축기계설비기술사', grade: '기술사', field: '기계·금속' },
  { name: '건축품질시험기술사', grade: '기술사', field: '건설·토목' },
  { name: '공조냉동기계기술사', grade: '기술사', field: '기계·금속' },
  { name: '교통기술사', grade: '기술사', field: '건설·토목' },
  { name: '기계안전기술사', grade: '기술사', field: '안전·환경' },
  { name: '농어업토목기술사', grade: '기술사', field: '건설·토목' },
  { name: '대기관리기술사', grade: '기술사', field: '안전·환경' },
  { name: '도로및공항기술사', grade: '기술사', field: '건설·토목' },
  { name: '산업위생관리기술사', grade: '기술사', field: '안전·환경' },
  { name: '소방기술사', grade: '기술사', field: '안전·환경' },
  { name: '수질관리기술사', grade: '기술사', field: '안전·환경' },
  { name: '응용지질기술사', grade: '기술사', field: '건설·토목' },
  { name: '전기응용기술사', grade: '기술사', field: '전기·전자' },
  { name: '전기철도기술사', grade: '기술사', field: '전기·전자' },
  { name: '정보관리기술사', grade: '기술사', field: 'IT·정보' },
  { name: '정보보안기술사', grade: '기술사', field: 'IT·정보' },
  { name: '철도신호기술사', grade: '기술사', field: '전기·전자' },
  { name: '토목구조기술사', grade: '기술사', field: '건설·토목' },
  { name: '토목시공기술사', grade: '기술사', field: '건설·토목' },
  { name: '토목품질시험기술사', grade: '기술사', field: '건설·토목' },
  { name: '폐기물처리기술사', grade: '기술사', field: '안전·환경' },
  { name: '화공안전기술사', grade: '기술사', field: '화학·식품' },
  // 기능장
  { name: '공유압기능장', grade: '기능장', field: '기계·금속' },
  { name: '귀금속가공기능장', grade: '기능장', field: '기계·금속' },
  { name: '금형기능장', grade: '기능장', field: '기계·금속' },
  { name: '기계가공조립기능장', grade: '기능장', field: '기계·금속' },
  { name: '도장기능장', grade: '기능장', field: '기계·금속' },
  { name: '방수기능장', grade: '기능장', field: '건설·토목' },
  { name: '배관기능장', grade: '기능장', field: '기계·금속' },
  { name: '사출성형기능장', grade: '기능장', field: '기계·금속' },
  { name: '에너지관리기능장', grade: '기능장', field: '기계·금속' },
  { name: '용접기능장', grade: '기능장', field: '기계·금속' },
  { name: '전기기능장', grade: '기능장', field: '전기·전자' },
  { name: '정밀측정기능장', grade: '기능장', field: '기계·금속' },
  { name: '제과기능장', grade: '기능장', field: '화학·식품' },
  { name: '조리기능장', grade: '기능장', field: '조리·서비스' },
  { name: '판금제관기능장', grade: '기능장', field: '기계·금속' },
  { name: '한복기능장', grade: '기능장', field: '조리·서비스' },
  // 기사
  { name: '가스기사', grade: '기사', field: '화학·식품' },
  { name: '건설안전기사', grade: '기사', field: '안전·환경' },
  { name: '건축기사', grade: '기사', field: '건설·토목' },
  { name: '건축설비기사', grade: '기사', field: '건설·토목' },
  { name: '공조냉동기계기사', grade: '기사', field: '기계·금속' },
  { name: '교통기사', grade: '기사', field: '건설·토목' },
  { name: '기계설계기사', grade: '기사', field: '기계·금속' },
  { name: '기계정비기사', grade: '기사', field: '기계·금속' },
  { name: '기계제작기사', grade: '기사', field: '기계·금속' },
  { name: '대기환경기사', grade: '기사', field: '안전·환경' },
  { name: '도로및공항기사', grade: '기사', field: '건설·토목' },
  { name: '방재기사', grade: '기사', field: '안전·환경' },
  { name: '산림기사', grade: '기사', field: '안전·환경' },
  { name: '산업안전기사', grade: '기사', field: '안전·환경' },
  { name: '소방설비기사(기계분야)', grade: '기사', field: '안전·환경' },
  { name: '소방설비기사(전기분야)', grade: '기사', field: '안전·환경' },
  { name: '수질환경기사', grade: '기사', field: '안전·환경' },
  { name: '식품기사', grade: '기사', field: '화학·식품' },
  { name: '에너지관리기사', grade: '기사', field: '기계·금속' },
  { name: '위험물기능사', grade: '기사', field: '화학·식품' },
  { name: '용접기사', grade: '기사', field: '기계·금속' },
  { name: '의공기사', grade: '기사', field: '기계·금속' },
  { name: '일반기계기사', grade: '기사', field: '기계·금속' },
  { name: '임업종묘기사', grade: '기사', field: '안전·환경' },
  { name: '전기기사', grade: '기사', field: '전기·전자' },
  { name: '전기공사기사', grade: '기사', field: '전기·전자' },
  { name: '전자기사', grade: '기사', field: '전기·전자' },
  { name: '전자계산기기사', grade: '기사', field: 'IT·정보' },
  { name: '정보보안기사', grade: '기사', field: 'IT·정보' },
  { name: '정보처리기사', grade: '기사', field: 'IT·정보' },
  { name: '조경기사', grade: '기사', field: '안전·환경' },
  { name: '철도신호기사', grade: '기사', field: '전기·전자' },
  { name: '토목기사', grade: '기사', field: '건설·토목' },
  { name: '토목품질시험기사', grade: '기사', field: '건설·토목' },
  { name: '항공기사', grade: '기사', field: '기계·금속' },
  { name: '화학분석기사', grade: '기사', field: '화학·식품' },
  { name: '화재감식평가기사', grade: '기사', field: '안전·환경' },
  { name: '환경기사', grade: '기사', field: '안전·환경' },
  // 산업기사
  { name: '가스산업기사', grade: '산업기사', field: '화학·식품' },
  { name: '건설안전산업기사', grade: '산업기사', field: '안전·환경' },
  { name: '건축산업기사', grade: '산업기사', field: '건설·토목' },
  { name: '공조냉동기계산업기사', grade: '산업기사', field: '기계·금속' },
  { name: '기계설계산업기사', grade: '산업기사', field: '기계·금속' },
  { name: '대기환경산업기사', grade: '산업기사', field: '안전·환경' },
  { name: '산업안전산업기사', grade: '산업기사', field: '안전·환경' },
  { name: '소방설비산업기사(기계)', grade: '산업기사', field: '안전·환경' },
  { name: '소방설비산업기사(전기)', grade: '산업기사', field: '안전·환경' },
  { name: '수질환경산업기사', grade: '산업기사', field: '안전·환경' },
  { name: '식품산업기사', grade: '산업기사', field: '화학·식품' },
  { name: '에너지관리산업기사', grade: '산업기사', field: '기계·금속' },
  { name: '용접산업기사', grade: '산업기사', field: '기계·금속' },
  { name: '전기산업기사', grade: '산업기사', field: '전기·전자' },
  { name: '전기공사산업기사', grade: '산업기사', field: '전기·전자' },
  { name: '전자산업기사', grade: '산업기사', field: '전기·전자' },
  { name: '정보처리산업기사', grade: '산업기사', field: 'IT·정보' },
  { name: '조경산업기사', grade: '산업기사', field: '안전·환경' },
  { name: '토목산업기사', grade: '산업기사', field: '건설·토목' },
  { name: '환경산업기사', grade: '산업기사', field: '안전·환경' },
  // 기능사
  { name: '가스기능사', grade: '기능사', field: '화학·식품' },
  { name: '건설재료시험기능사', grade: '기능사', field: '건설·토목' },
  { name: '굴착기운전기능사', grade: '기능사', field: '운전·운반' },
  { name: '귀금속가공기능사', grade: '기능사', field: '기계·금속' },
  { name: '금형제작기능사', grade: '기능사', field: '기계·금속' },
  { name: '기계가공기능사', grade: '기능사', field: '기계·금속' },
  { name: '내선전공기능사', grade: '기능사', field: '전기·전자' },
  { name: '도배기능사', grade: '기능사', field: '건설·토목' },
  { name: '도장기능사', grade: '기능사', field: '기계·금속' },
  { name: '로그보드제작기능사', grade: '기능사', field: '기계·금속' },
  { name: '목공예기능사', grade: '기능사', field: '기계·금속' },
  { name: '미용사(일반)', grade: '기능사', field: '조리·서비스' },
  { name: '미용사(피부)', grade: '기능사', field: '조리·서비스' },
  { name: '미용사(네일)', grade: '기능사', field: '조리·서비스' },
  { name: '미용사(메이크업)', grade: '기능사', field: '조리·서비스' },
  { name: '배관기능사', grade: '기능사', field: '기계·금속' },
  { name: '산업안전기능사', grade: '기능사', field: '안전·환경' },
  { name: '서양조리기능사', grade: '기능사', field: '조리·서비스' },
  { name: '세탁기능사', grade: '기능사', field: '조리·서비스' },
  { name: '소성가공기능사', grade: '기능사', field: '기계·금속' },
  { name: '수제화기능사', grade: '기능사', field: '조리·서비스' },
  { name: '승강기기능사', grade: '기능사', field: '기계·금속' },
  { name: '양식조리기능사', grade: '기능사', field: '조리·서비스' },
  { name: '에너지관리기능사', grade: '기능사', field: '기계·금속' },
  { name: '용접기능사', grade: '기능사', field: '기계·금속' },
  { name: '위험물기능사', grade: '기능사', field: '화학·식품' },
  { name: '이용사', grade: '기능사', field: '조리·서비스' },
  { name: '일식조리기능사', grade: '기능사', field: '조리·서비스' },
  { name: '자동차정비기능사', grade: '기능사', field: '기계·금속' },
  { name: '전기기능사', grade: '기능사', field: '전기·전자' },
  { name: '전자기기기능사', grade: '기능사', field: '전기·전자' },
  { name: '정보기기운용기능사', grade: '기능사', field: 'IT·정보' },
  { name: '제과기능사', grade: '기능사', field: '화학·식품' },
  { name: '제빵기능사', grade: '기능사', field: '화학·식품' },
  { name: '조경기능사', grade: '기능사', field: '안전·환경' },
  { name: '조적기능사', grade: '기능사', field: '건설·토목' },
  { name: '지게차운전기능사', grade: '기능사', field: '운전·운반' },
  { name: '철근기능사', grade: '기능사', field: '건설·토목' },
  { name: '컴퓨터활용능력 1급', grade: '기능사', field: 'IT·정보' },
  { name: '컴퓨터활용능력 2급', grade: '기능사', field: 'IT·정보' },
  { name: '타일기능사', grade: '기능사', field: '건설·토목' },
  { name: '판금제관기능사', grade: '기능사', field: '기계·금속' },
  { name: '한식조리기능사', grade: '기능사', field: '조리·서비스' },
  { name: '항공기체정비기능사', grade: '기능사', field: '기계·금속' },
  { name: '화약취급기능사', grade: '기능사', field: '화학·식품' },
  { name: '환경기능사', grade: '기능사', field: '안전·환경' },
  { name: '회로기판기능사', grade: '기능사', field: '전기·전자' },
];

// ====== 전체 종목 상태 ======
let allItems = []; // 실제 표시 목록 (API 또는 내장)
let filteredItems = [];
let displayCount = 60; // 한 번에 표시할 수
const PAGE_SIZE = 60;

// 등급 → API 매핑
const GRADE_TO_API = {
  '기술사': 'pe', '기능장': 'mc',
  '기사': 'e', '산업기사': 'e', '기능사': 'c',
};

// 등급 → 뱃지 클래스
function gradeBadgeClass(grade) {
  return {
    '기술사': 'grade-pe-badge', '기능장': 'grade-mc-badge',
    '기사': 'grade-e-badge', '산업기사': 'grade-ie-badge',
    '기능사': 'grade-c-badge'
  }[grade] || 'grade-e-badge';
}

// ====== 전체 종목 API 로드 ======
async function fetchAllItemsFromAPI() {
  const directUrl = `${API_CONFIG.baseUrl}/${API_CONFIG.endpoints.jm}?serviceKey=${API_CONFIG.serviceKey}`;
  const proxyUrl = `${API_CONFIG.corsProxy}${encodeURIComponent(directUrl)}`;

  let xmlText = null;
  try {
    const res = await fetch(directUrl, { signal: AbortSignal.timeout(1500) });
    if (res.ok) xmlText = await res.text();
  } catch (e) { /* 직접 실패 */ }

  if (!xmlText) {
    try {
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(2500) });
      if (res.ok) xmlText = await res.text();
    } catch (e) { /* 프록시도 실패 */ }
  }

  if (!xmlText) return null;

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
  const resultCode = xmlDoc.querySelector('resultCode')?.textContent;
  if (resultCode !== '00') return null;

  const items = Array.from(xmlDoc.querySelectorAll('item'));
  const seen = new Set();
  const result = [];

  items.forEach(item => {
    const jmNm = item.querySelector('jmNm')?.textContent?.trim() ||
      item.querySelector('description')?.textContent?.trim() || '';
    const grdNm = item.querySelector('grdNm')?.textContent?.trim() || '';
    if (!jmNm || seen.has(jmNm)) return;
    seen.add(jmNm);
    // 분야는 내장 데이터에서 매칭
    const found = ALL_ITEMS_DATA.find(d => d.name === jmNm);
    result.push({ name: jmNm, grade: grdNm || found?.grade || '', field: found?.field || '기타' });
  });

  return result.length > 0 ? result : null;
}

// ====== 전체 종목 초기화 ======
async function initAllItems() {
  const loading = document.getElementById('allitems-loading');
  const grid = document.getElementById('allitems-grid');
  loading.style.display = 'flex';
  grid.innerHTML = '';

  // API 시도
  const apiResult = await fetchAllItemsFromAPI();
  if (apiResult && apiResult.length > 0) {
    allItems = apiResult;
  } else {
    allItems = [...ALL_ITEMS_DATA];
  }

  // 이름 정렬
  allItems.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

  loading.style.display = 'none';
  filteredItems = [...allItems];
  displayCount = PAGE_SIZE;
  renderAllItemsGrid();
  updateCount();
  bindAllItemsEvents();
}

// ====== 그리드 렌더링 ======
function renderAllItemsGrid() {
  const grid = document.getElementById('allitems-grid');
  const moreWrap = document.getElementById('allitems-more-wrap');
  const slice = filteredItems.slice(0, displayCount);

  if (filteredItems.length === 0) {
    grid.innerHTML = `
      <div class="allitems-empty">
        <div class="allitems-empty-icon">🔍</div>
        <p>검색 결과가 없습니다.</p>
      </div>`;
    moreWrap.style.display = 'none';
    return;
  }

  grid.innerHTML = slice.map((item, idx) => `
    <div class="item-card" data-grade="${item.grade}"
         data-name="${item.name}" data-api="${GRADE_TO_API[item.grade] || 'e'}"
         id="item-card-${idx}" style="animation-delay:${(idx % PAGE_SIZE) * 0.02}s">
      <div class="item-card-name">${item.name}</div>
      <div class="item-card-meta">
        <span class="item-grade-badge ${gradeBadgeClass(item.grade)}">${item.grade}</span>
        <span class="item-field-badge">${item.field}</span>
      </div>
      <span class="item-card-arrow">›</span>
    </div>
  `).join('');

  // 클릭 이벤트
  grid.querySelectorAll('.item-card').forEach(card => {
    card.addEventListener('click', () => {
      const name = card.dataset.name;
      const api = card.dataset.api;
      document.getElementById('main-search-input').value = name;
      searchQualification(name, api);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  // 더보기 버튼
  if (filteredItems.length > displayCount) {
    moreWrap.style.display = 'flex';
    document.getElementById('allitems-more-btn').textContent =
      `더 보기 (${filteredItems.length - displayCount}개 남음)`;
  } else {
    moreWrap.style.display = 'none';
  }
}

// ====== 카운트 업데이트 ======
function updateCount() {
  const el = document.getElementById('allitems-count');
  const total = filteredItems.length;
  const shown = Math.min(displayCount, total);
  el.textContent = `총 ${total}개 종목 (${shown}개 표시)`;
}

// ====== 필터 적용 ======
let filterGrade = 'all';
let filterField = 'all';
let filterSearchText = '';

function applyFilters() {
  filteredItems = allItems.filter(item => {
    const matchGrade = filterGrade === 'all' || item.grade === filterGrade;
    const matchField = filterField === 'all' || item.field === filterField;
    const matchSearch = !filterSearchText ||
      item.name.includes(filterSearchText) ||
      item.grade.includes(filterSearchText) ||
      item.field.includes(filterSearchText);
    return matchGrade && matchField && matchSearch;
  });
  displayCount = PAGE_SIZE;
  renderAllItemsGrid();
  updateCount();
}

// ====== 전체 종목 이벤트 바인딩 ======
function bindAllItemsEvents() {
  // 텍스트 검색
  const searchInput = document.getElementById('allitems-search');
  const clearBtn = document.getElementById('allitems-clear');

  searchInput.addEventListener('input', () => {
    filterSearchText = searchInput.value.trim();
    clearBtn.style.display = filterSearchText ? 'block' : 'none';
    applyFilters();
  });

  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    filterSearchText = '';
    clearBtn.style.display = 'none';
    applyFilters();
  });

  // 등급 필터 칩
  document.querySelectorAll('[data-filter-grade]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-grade]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filterGrade = chip.dataset.filterGrade;
      applyFilters();
    });
  });

  // 분야 필터 칩
  document.querySelectorAll('[data-filter-field]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-filter-field]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filterField = chip.dataset.filterField;
      applyFilters();
    });
  });

  // 더 보기
  document.getElementById('allitems-more-btn').addEventListener('click', () => {
    displayCount += PAGE_SIZE;
    renderAllItemsGrid();
    updateCount();
  });
}

// ====== 앱 초기화 ======
async function init() {
  createParticles();
  setupScrollEffects();
  renderPopular();
  renderFees();
  bindEvents();

  // D-Day 초기 렌더링
  const ddayGrid = document.getElementById('dday-grid');
  ddayGrid.innerHTML = `
    <div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--color-text2);">
      <p>시험 일정을 불러오면 D-Day가 표시됩니다.</p>
    </div>`;

  // 기본 탭 (기술사) 로드
  await loadSchedule('pe');

  // 전체 종목 로드 (백그라운드)
  initAllItems();
}

document.addEventListener('DOMContentLoaded', init);
