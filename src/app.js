import { createRouter } from './router.js';
import { authStore } from './services/auth-store.js';
import { deleteSavedStory, saveStory } from './services/idb.js';
import { state } from './state/app-state.js';
import { renderLoginPage, renderRegisterPage } from './views/auth.js';
import { renderHomePage } from './views/home.js';
import { renderAddStoryPage } from './views/add-story.js';
import { renderStoryDetailPage } from './views/story-detail.js';

export function createApp(root) {
  const router = createRouter({
    beforeEach: (route) => {
      const session = authStore.getSession();

      if (route.protected && !session?.token) {
        window.location.hash = '#/login';
        return false;
      }

      if (route.guestOnly && session?.token) {
        window.location.hash = '#/';
        return false;
      }

      return true;
    },
  });

  const detailHelpers = {
    setSavedStories,
    toggleSavedStory,
  };

  router.addRoute('/', {
    protected: true,
    title: 'Latest Stories',
    render: () => renderHomePage(root),
  });

  router.addRoute('/login', {
    guestOnly: true,
    title: 'Login',
    render: () => renderLoginPage(root),
  });

  router.addRoute('/register', {
    guestOnly: true,
    title: 'Register',
    render: () => renderRegisterPage(root),
  });

  router.addRoute('/stories/new', {
    protected: true,
    title: 'Add Story',
    render: () => renderAddStoryPage(root),
  });

  router.addRoute('/stories/:id', {
    protected: true,
    title: 'Story Detail',
    render: ({ params }) => renderStoryDetailPage(root, params.id, detailHelpers),
  });

  root.addEventListener('click', (event) => {
    const logoutButton = event.target.closest('[data-action="logout"]');
    if (!logoutButton) {
      return;
    }

    authStore.clearSession();
    state.user = null;
    window.location.hash = '#/login';
  });

  router.start();
}

function setSavedStories(stories) {
  state.savedStories = [...stories].sort((left, right) => {
    const leftTime = new Date(left.savedAt || left.createdAt || 0).getTime();
    const rightTime = new Date(right.savedAt || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
  state.savedStoryIds = new Set(state.savedStories.map((story) => story.id));
}

async function toggleSavedStory(story) {
  if (state.savedStoryIds.has(story.id)) {
    await deleteSavedStory(story.id);
    setSavedStories(state.savedStories.filter((item) => item.id !== story.id));
    return { saved: false, message: 'Saved copy removed.' };
  }

  const savedRecord = await saveStory(story);
  setSavedStories([savedRecord, ...state.savedStories.filter((item) => item.id !== story.id)]);
  return { saved: true, message: 'Story saved for offline reading.' };
}
