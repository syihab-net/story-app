function normalizeHash(hash) {
  if (!hash || hash === '#') {
    return '/';
  }

  return hash.replace(/^#/, '');
}

function matchRoute(pathname, routePath) {
  const pathnameParts = pathname.split('/').filter(Boolean);
  const routeParts = routePath.split('/').filter(Boolean);

  if (pathnameParts.length !== routeParts.length) {
    return null;
  }

  const params = {};

  for (let index = 0; index < routeParts.length; index += 1) {
    const routePart = routeParts[index];
    const pathPart = pathnameParts[index];

    if (routePart.startsWith(':')) {
      params[routePart.slice(1)] = decodeURIComponent(pathPart);
      continue;
    }

    if (routePart !== pathPart) {
      return null;
    }
  }

  return params;
}

export function createRouter({ beforeEach } = {}) {
  const routes = [];

  async function navigate() {
    const pathname = normalizeHash(window.location.hash);
    const route = routes.find((item) => matchRoute(pathname, item.path) !== null);

    if (!route) {
      window.location.hash = '#/';
      return;
    }

    const params = matchRoute(pathname, route.path);
    const allowed = beforeEach ? beforeEach(route) : true;
    let renderPromise;

    if (!allowed) {
      return;
    }

    if (document.startViewTransition) {
      const transition = document.startViewTransition(() => {
        renderPromise = Promise.resolve(route.render({ params }));
      });
      await transition.finished;
    } else {
      renderPromise = Promise.resolve(route.render({ params }));
    }

    await renderPromise;
    document.title = `${route.title} | Dicoding Story`;
    focusRouteContent();
  }

  return {
    addRoute(path, config) {
      routes.push({ path, ...config });
    },
    start() {
      window.addEventListener('hashchange', navigate);
      navigate();
    },
  };
}

function focusRouteContent() {
  const preferredTarget = document.querySelector('#main-content h1, #main-content h2');
  const fallbackTarget = document.querySelector('#main-content');
  const focusTarget = preferredTarget || fallbackTarget;

  if (!focusTarget) {
    return;
  }

  if (!focusTarget.hasAttribute('tabindex')) {
    focusTarget.setAttribute('tabindex', '-1');
  }

  focusTarget.focus();
}
