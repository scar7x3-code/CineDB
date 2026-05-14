/* ─────────────────────────────────────────────────────────
   CineDB — app.js
   Handles: catalog grid, autocomplete search, filters,
            pagination, and navigation to detail pages.
───────────────────────────────────────────────────────── */

/* ── DOM refs ───────────────────────────────────────────── */
const searchInput  = document.getElementById('searchInput');
const searchBtn    = document.getElementById('searchBtn');
const suggestions  = document.getElementById('suggestions');
const grid         = document.getElementById('grid');
const fallbackPosterSvg = 'css/fb736350-dcb2-496c-99fb-ad6e69fea5c4.svg';
const skeletonGrid = document.getElementById('skeletonGrid');
const emptyState   = document.getElementById('emptyState');
const pagination   = document.getElementById('pagination');
const prevBtn      = document.getElementById('prevBtn');
const nextBtn      = document.getElementById('nextBtn');
const pageInfo     = document.getElementById('pageInfo');
const catalogHeading = document.getElementById('catalogHeading');
const filterBtns   = document.querySelectorAll('.filter-btn');

/* ── State ──────────────────────────────────────────────── */
const state = {
  query:       '',
  /** When `query` is empty, OMDb still needs `s=`; we pick once and reuse for pagination. */
  browseSeed:  '',
  type:        '',
  page:        1,
  totalPages:  1,
  loading:     false,
};

/**
 * OMDb search has no popularity sort (only `s`, `type`, `y`, `page`).
 * Browse mode therefore uses: (1) a fixed-order IMDb spotlight on page 1,
 * (2) franchise-style title seeds so relevance-heavy results skew famous titles.
 */
const TRENDING_BROWSE_YEAR = '2026';

const SPOTLIGHT_IMDB_IDS = {
  /**
   * 2026 editorial “trending” slate (fixed order = grid order on page 1).
   * Super Mario Galaxy: la película → … → Scare Out
   */
  trending: [
    'tt28650488', // The Super Mario Galaxy Movie
    'tt12042730', // Project Hail Mary
    'tt38035835', // Pegasus 3
    'tt11378946', // Michael
    'tt33612209', // The Devil Wears Prada 2
    'tt26443616', // Hoppers
    'tt32897959', // Wuthering Heights (Cumbres Borrascosas)
    'tt32649961', // Blades of the Guardians
    'tt27047903', // Scream 7
    'tt36535318', // Scare Out
  ],
  /** Widely known films — editorial “most popular” stand-ins. */
  movie: [
    'tt4154796', // Avengers: Endgame
    'tt0468569', // The Dark Knight
    'tt0848228', // The Avengers
    'tt0111161', // The Shawshank Redemption
    'tt0068646', // The Godfather
    'tt1375666', // Inception
  ],
  series: [
    'tt0903747', // Breaking Bad
    'tt0944947', // Game of Thrones
    'tt4574334', // Stranger Things
    'tt0386676', // The Office
    'tt0108778', // Friends
    'tt1442462', // Better Call Saul
  ],
};

const POPULAR_SEARCH_SEEDS = {
  movie: [
    'marvel', 'batman', 'avengers', 'spider', 'superman', 'fast', 'jurassic',
    'mission', 'bond', 'harry',
  ],
  series: [
    'breaking', 'stranger', 'game', 'office', 'friends', 'walking', 'better',
    'succession', 'sherlock', 'wire',
  ],
};

function browseSeedPoolKey() {
  if (state.type === 'movie') return 'movie';
  if (state.type === 'series') return 'series';
  return 'trending';
}

function pickBrowseSeed() {
  const key = browseSeedPoolKey();
  const pool = POPULAR_SEARCH_SEEDS[key];
  return pool[Math.floor(Math.random() * pool.length)];
}

function spotlightIdsForTab() {
  const key = browseSeedPoolKey();
  return SPOTLIGHT_IMDB_IDS[key];
}

async function fetchMovieSummary(id) {
  try {
    const res = await fetch(`/api/movie?id=${encodeURIComponent(id)}`);
    if (!res.ok) return null;
    const d = await res.json();
    if (d.Response === 'False') return null;
    return {
      Title:  d.Title,
      Year:   d.Year,
      imdbID: d.imdbID,
      Type:   d.Type,
      Poster: d.Poster,
    };
  } catch {
    return null;
  }
}

async function fetchSpotlightSummaries(ids) {
  const rows = await Promise.all(ids.map(fetchMovieSummary));
  return rows.filter(Boolean);
}

/* ── API helpers ────────────────────────────────────────── */
async function searchMovies(q, type = '', page = 1, year = '') {
  const params = new URLSearchParams({ q, page });
  if (type) params.set('type', type);
  if (year) params.set('year', year);
  const res = await fetch(`/api/search?${params}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

/* ── Rendering ──────────────────────────────────────────── */
function renderCard(item) {
  const hasPoster = item.Poster && item.Poster !== 'N/A';
  const isSeries  = item.Type === 'series';
  const posterSrc = hasPoster ? escapeHtml(item.Poster) : '';
  const titleEsc    = escapeHtml(item.Title);
  const yearEsc     = escapeHtml(item.Year);
  const typeEsc     = escapeHtml(item.Type);

  const card = document.createElement('a');
  card.className = 'card';
  card.href      = `/movie?id=${item.imdbID}`;
  card.innerHTML = `
    <div class="card-poster-wrap">
      ${hasPoster
        ? `<img class="card-poster" src="${posterSrc}" alt="${titleEsc}" loading="lazy" />`
        : `<div class="card-no-poster">🎬</div>`}
      <span class="card-type-badge ${isSeries ? 'series' : ''}">${typeEsc}</span>
    </div>
    <div class="card-body">
      <p class="card-title">${titleEsc}</p>
      <p class="card-year">${yearEsc}</p>
    </div>
  `;
  return card;
}

function renderGrid(items) {
  grid.innerHTML = '';
  items.forEach(item => grid.appendChild(renderCard(item)));
}

function setLoading(isLoading) {
  state.loading = isLoading;
  skeletonGrid.classList.toggle('loading', isLoading);
  grid.classList.toggle('loading', isLoading);
}

function updatePagination() {
  const show = state.totalPages > 1;
  pagination.hidden = !show;
  if (!show) return;

  prevBtn.disabled = state.page <= 1;
  nextBtn.disabled = state.page >= state.totalPages;
  pageInfo.textContent = `${state.page} / ${state.totalPages}`;
}

/* ── Load catalog ───────────────────────────────────────── */
async function loadCatalog() {
  if (state.loading) return;

  setLoading(true);
  emptyState.hidden = true;
  pagination.hidden = true;

  try {
    let query = state.query.trim();
    let yearArg = '';

    if (!query && state.type === '') {
      catalogHeading.textContent = `Trending Now (${TRENDING_BROWSE_YEAR})`;
      if (state.page !== 1) state.page = 1;
      const spotlight = await fetchSpotlightSummaries(spotlightIdsForTab());
      setLoading(false);
      const rows = spotlight.slice(0, 10);
      if (!rows.length) {
        renderGrid([]);
        emptyState.hidden = false;
      } else {
        renderGrid(rows);
        state.totalPages = 1;
        updatePagination();
      }
      return;
    }

    // Browse (no user query): franchise-style search + optional year for Movies/Series (OMDb has no popularity sort).
    if (!query) {
      if (!state.browseSeed) state.browseSeed = pickBrowseSeed();
      query = state.browseSeed;

      if (state.type === 'movie') {
        catalogHeading.textContent = 'Popular movies';
      } else {
        catalogHeading.textContent = 'Popular series';
      }
    } else {
      catalogHeading.textContent = `Results for "${state.query}"`;
    }

    const spotlightPromise =
      !query && state.page === 1
        ? fetchSpotlightSummaries(spotlightIdsForTab())
        : Promise.resolve([]);

    const [data, spotlight] = await Promise.all([
      searchMovies(query, state.type, state.page, yearArg),
      spotlightPromise,
    ]);

    setLoading(false);

    if (data.Response === 'False' || !data.Search?.length) {
      if (spotlight.length) {
        renderGrid(spotlight);
        state.totalPages = 1;
        updatePagination();
      } else {
        renderGrid([]);
        emptyState.hidden = false;
      }
      return;
    }

    let rows = data.Search;
    if (spotlight.length) {
      const seen = new Set(spotlight.map((i) => i.imdbID));
      rows = [...spotlight, ...rows.filter((i) => !seen.has(i.imdbID))];
    }
    renderGrid(rows);
    const total = parseInt(String(data.totalResults).replace(/,/g, ''), 10);
    state.totalPages = Number.isFinite(total) && total > 0 ? Math.ceil(total / 10) : 1;
    updatePagination();

  } catch (err) {
    setLoading(false);
    console.error(err);
    emptyState.hidden = false;
  }
}

/* ── Autocomplete ───────────────────────────────────────── */
let debounceTimer = null;
let currentFocus  = -1;

function renderSuggestions(items) {
  suggestions.innerHTML = '';
  if (!items.length) { suggestions.hidden = true; return; }

  items.slice(0, 6).forEach((item, i) => {
    const hasPoster = item.Poster && item.Poster !== 'N/A';
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    li.dataset.id = item.imdbID;
    const titleEsc = escapeHtml(item.Title);
    const yearEsc  = escapeHtml(item.Year);
    const typeEsc  = escapeHtml(item.Type);
    const posterSrc = hasPoster ? escapeHtml(item.Poster) : fallbackPosterSvg;
    li.innerHTML = `
      <img
        class="suggestion-poster"
        src="${posterSrc}"
        alt=""
      />
      <div class="suggestion-info">
        <p class="suggestion-title">${titleEsc}</p>
        <p class="suggestion-meta">${yearEsc} &nbsp;<span>${typeEsc}</span></p>
      </div>
    `;
    li.addEventListener('click', () => {
      window.location.href = `/movie?id=${item.imdbID}`;
    });
    suggestions.appendChild(li);
  });

  suggestions.hidden = false;
  currentFocus = -1;
}

function closeSuggestions() {
  suggestions.hidden = true;
  currentFocus = -1;
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  clearTimeout(debounceTimer);

  if (q.length < 2) { closeSuggestions(); return; }

  debounceTimer = setTimeout(async () => {
    try {
      const data = await searchMovies(q, state.type, 1);
      renderSuggestions(data.Response === 'True' ? data.Search : []);
    } catch {
      closeSuggestions();
    }
  }, 280);
});

// Keyboard navigation inside suggestions
searchInput.addEventListener('keydown', (e) => {
  const items = suggestions.querySelectorAll('.suggestion-item');
  if (!items.length) {
    if (e.key === 'Enter') triggerSearch();
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    currentFocus = Math.min(currentFocus + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    currentFocus = Math.max(currentFocus - 1, -1);
  } else if (e.key === 'Enter') {
    if (currentFocus >= 0) {
      items[currentFocus].click();
    } else {
      closeSuggestions();
      triggerSearch();
    }
    return;
  } else if (e.key === 'Escape') {
    closeSuggestions();
    return;
  }

  items.forEach((el, i) => el.classList.toggle('active', i === currentFocus));
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) closeSuggestions();
});

/* ── Search trigger ─────────────────────────────────────── */
function triggerSearch() {
  const q = searchInput.value.trim();
  state.query = q;
  state.browseSeed = '';
  state.page  = 1;
  closeSuggestions();
  loadCatalog();
}

searchBtn.addEventListener('click', triggerSearch);

/* ── Filters ────────────────────────────────────────────── */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.type = btn.dataset.type;
    state.page = 1;
    state.browseSeed = '';
    loadCatalog();
  });
});

/* ── Pagination ─────────────────────────────────────────── */
prevBtn.addEventListener('click', () => {
  if (state.page > 1) { state.page--; loadCatalog(); scrollToTop(); }
});
nextBtn.addEventListener('click', () => {
  if (state.page < state.totalPages) { state.page++; loadCatalog(); scrollToTop(); }
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Init ───────────────────────────────────────────────── */
const initialQ = new URLSearchParams(window.location.search).get('q');
if (initialQ) {
  const trimmed = initialQ.trim();
  searchInput.value = trimmed;
  state.query = trimmed;
  state.browseSeed = '';
}

loadCatalog();
