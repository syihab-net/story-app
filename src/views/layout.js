import { escapeHtml } from '../services/utils.js';
import { authStore } from '../services/auth-store.js';

export function renderShell(content, options = {}) {
  const user = authStore.getUser();
  const currentHash = window.location.hash || '#/';
  const pageClass = options.pageClass ?? '';
  const showHeader = options.showHeader ?? true;
  const hideFooter = options.hideFooter ?? false;

  return `
    <div class="app-shell ${pageClass}">
      ${showHeader ? renderHeader(user, currentHash) : ''}
      <main id="main-content" class="page-content" tabindex="-1">${content}</main>
      <footer class="app-footer ${hideFooter ? 'visually-hidden' : ''}">
        <p>Dicoding Story. Share moments around the map.</p>
      </footer>
    </div>
  `;
}

export function renderAuthLayout({ title, subtitle, formMarkup, footerMarkup }) {
  return renderShell(
    `
      <section class="auth-layout">
        <div class="auth-layout__hero">
          <h1>${escapeHtml(title)}</h1>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        <section class="panel auth-card">
          ${formMarkup}
          ${footerMarkup}
        </section>
      </section>
    `,
    { pageClass: 'app-shell--auth', showHeader: false },
  );
}

export function getInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((token) => token[0]?.toUpperCase())
    .join('');
}

function renderHeader(user, currentHash) {
  const isHome = currentHash === '#/';
  const isAddStory = currentHash === '#/stories/new';

  return `
    <header class="topbar">
      <a class="brand" href="#/" aria-label="Dicoding Story home">
        <span class="brand__mark" aria-hidden="true">◎</span>
        <span class="brand__name">Dicoding Story</span>
      </a>
      <nav class="topbar__nav" aria-label="Primary navigation">
        ${
          isHome
            ? '<span class="topbar__label topbar__label--active">Home</span>'
            : '<a class="ghost-link" href="#/">Home</a>'
        }
        ${
          isAddStory
            ? '<span class="topbar__label topbar__label--active">Add Story</span>'
            : '<a class="ghost-link" href="#/stories/new">Add Story</a>'
        }
      </nav>
      <details class="profile-menu">
        <summary class="profile-chip" aria-label="Open account menu">
          <span class="profile-chip__avatar">${getInitials(user?.name || 'Story Scope')}</span>
          <span class="profile-chip__name">${escapeHtml(user?.name || 'Profile')}</span>
        </summary>
        <div class="profile-menu__dropdown">
          <button class="profile-menu__item" type="button" data-action="logout">Logout</button>
        </div>
      </details>
    </header>
  `;
}
