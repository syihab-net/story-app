import { DEFAULT_CENTER, DEFAULT_ZOOM, TILE_LAYERS } from '../config/map.js';
import { api } from '../services/api.js';
import { deleteSavedStory, getSavedStories, getSavedStory, saveStory } from '../services/idb.js';
import {
  getExistingSubscription,
  serializeSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '../services/notification.js';
import { escapeHtml, formatRelativeTime, parseErrorMessage } from '../services/utils.js';
import { state } from '../state/app-state.js';
import { createStoryMap } from '../ui/story-map.js';
import { renderShell } from './layout.js';

export async function renderHomePage(root) {
  root.innerHTML = renderShell(
    `
      <section class="story-board story-board--immersive">
        <aside class="story-list-panel story-list-panel--immersive">
          <div class="story-list-panel__intro">
            <div class="story-list-panel__intro-copy">
              <h1>Latest stories</h1>
              <p class="muted-copy">Pick one card to focus its marker on the map.</p>
            </div>
            <div class="story-list-panel__controls">
              <div class="toggle-group" role="tablist" aria-label="Story feed">
                <button class="toggle-chip" type="button" data-feed="latest">All</button>
                <button class="toggle-chip" type="button" data-feed="saved">Saved</button>
              </div>
              ${
                state.notificationsSupported
                  ? '<button class="secondary-button secondary-button--compact" type="button" id="notification-toggle"></button>'
                  : ''
              }
              <p class="form-feedback" id="notification-feedback" role="status" aria-live="polite"></p>
            </div>
          </div>
          <div class="story-list" id="story-list" aria-live="polite"></div>
        </aside>
        <section class="map-panel map-panel--immersive">
          <div class="map-panel__canvas map-panel__canvas--immersive" id="stories-map" aria-label="Stories map"></div>
        </section>
      </section>
    `,
    { pageClass: 'app-shell--home', hideFooter: true },
  );

  const listElement = root.querySelector('#story-list');
  const mapElement = root.querySelector('#stories-map');
  const notificationButton = root.querySelector('#notification-toggle');
  const notificationFeedback = root.querySelector('#notification-feedback');
  const mapView = createStoryMap(mapElement, {
    center: DEFAULT_CENTER,
    defaultZoom: DEFAULT_ZOOM,
    tileLayers: TILE_LAYERS,
  });

  listElement.innerHTML = renderLoadingCards();

  root.querySelectorAll('[data-feed]').forEach((button) => {
    button.addEventListener('click', () => {
      state.storyFeed = button.dataset.feed;
      if (!getDisplayedStories().some((story) => story.id === state.activeStoryId)) {
        state.activeStoryId = null;
      }
      renderHomeFeed(root, mapView);
    });
  });

  notificationButton?.addEventListener('click', async () => {
    if (state.notificationBusy) {
      return;
    }

    state.notificationBusy = true;
    notificationFeedback.className = 'form-feedback';
    notificationFeedback.textContent = '';
    updateNotificationButton(notificationButton);

    try {
      if (state.notificationsEnabled) {
        const subscription = await getExistingSubscription();
        if (subscription) {
          await api.unsubscribeNotification({ endpoint: subscription.endpoint });
          await unsubscribeFromPush();
        }
        state.notificationsEnabled = false;
        notificationFeedback.textContent = 'Push notification disabled.';
      } else {
        const subscription = await subscribeToPush();
        await api.subscribeNotification(serializeSubscription(subscription));
        state.notificationsEnabled = true;
        notificationFeedback.textContent = 'Push notification enabled.';
      }

      notificationFeedback.classList.add('form-feedback--success');
    } catch (error) {
      notificationFeedback.textContent = parseErrorMessage(error);
      notificationFeedback.classList.add('form-feedback--error');
    } finally {
      state.notificationBusy = false;
      updateNotificationButton(notificationButton);
    }
  });

  listElement.addEventListener('click', async (event) => {
    const saveButton = event.target.closest('[data-action="toggle-save"]');
    if (saveButton) {
      event.preventDefault();
      event.stopPropagation();
      const story = findStoryById(saveButton.dataset.storyId);
      if (!story) {
        return;
      }

      await toggleSavedStory(story);
      if (!getDisplayedStories().some((item) => item.id === state.activeStoryId)) {
        state.activeStoryId = null;
      }
      renderHomeFeed(root, mapView);
      return;
    }

    const focusButton = event.target.closest('[data-focus-story]');
    if (!focusButton) {
      return;
    }

    state.activeStoryId = focusButton.dataset.storyId;
    renderHomeFeed(root, mapView);
    focusStoryOnMap(state.activeStoryId, mapView);
  });

  try {
    const [savedStories] = await Promise.all([getSavedStories(), syncNotificationState()]);

    setSavedStories(savedStories);
    updateNotificationButton(notificationButton);

    const response = await api.getStories({ location: 1, page: 1, size: 100 });
    state.stories = response.listStory;

    renderHomeFeed(root, mapView);
  } catch (error) {
    updateNotificationButton(notificationButton);
    renderHomeFeed(root, mapView, parseErrorMessage(error));
  }
}

function renderHomeFeed(root, mapView, latestErrorMessage = '') {
  const listElement = root.querySelector('#story-list');
  const displayedStories = getDisplayedStories();
  const isSavedFeed = state.storyFeed === 'saved';

  root.querySelectorAll('[data-feed]').forEach((button) => {
    const isActive = button.dataset.feed === state.storyFeed;
    button.classList.toggle('toggle-chip--active', isActive);
    button.setAttribute('aria-selected', String(isActive));
  });

  if (!displayedStories.some((story) => story.id === state.activeStoryId)) {
    state.activeStoryId = null;
  }

  if (!displayedStories.length) {
    listElement.innerHTML = `
      <div class="empty-state ${latestErrorMessage && !isSavedFeed ? 'empty-state--error' : ''}">
        ${escapeHtml(resolveHomeEmptyMessage(isSavedFeed, latestErrorMessage))}
      </div>
    `;
    mapView.renderStories([]);
    return;
  }

  listElement.innerHTML = renderStoryList(displayedStories, state.activeStoryId, state.savedStoryIds);
  mapView.renderStories(displayedStories, state.activeStoryId);
}

function renderStoryList(stories, activeStoryId, savedStoryIds) {
  return stories
    .map((story) => {
      const isActive = story.id === activeStoryId;
      const isSaved = savedStoryIds.has(story.id);
      const storyDescription = story.description.replace(/\s+/g, ' ').trim();

      return `
        <article class="story-card ${isActive ? 'story-card--active' : ''}">
          <button
            class="story-card__surface"
            type="button"
            data-focus-story="true"
            data-story-id="${escapeHtml(story.id)}"
            aria-label="Focus story from ${escapeHtml(story.name)} on the map"
          >
            <img
              class="story-card__image"
              src="${escapeHtml(story.photoUrl)}"
              alt="Story from ${escapeHtml(story.name)}"
            />
            <div class="story-card__content">
              <div class="story-card__header">
                <p class="story-card__author">${escapeHtml(story.name)}</p>
                <p class="story-card__date">${formatRelativeTime(story.createdAt)}</p>
              </div>
              <p class="story-card__description">${escapeHtml(storyDescription)}</p>
            </div>
          </button>
          <div class="story-card__footer">
            <button
              class="story-card__save ${isSaved ? 'story-card__save--active' : ''}"
              type="button"
              data-action="toggle-save"
              data-story-id="${escapeHtml(story.id)}"
              aria-label="${isSaved ? 'Remove from saved stories' : 'Save this story offline'}"
              title="${isSaved ? 'Remove from saved stories' : 'Save this story offline'}"
            >
              ${isSaved ? 'Saved' : 'Save'}
            </button>
            <a class="text-link" href="#/stories/${escapeHtml(story.id)}">Detail</a>
          </div>
        </article>
      `;
    })
    .join('');
}

function renderLoadingCards() {
  return Array.from({ length: 3 }, () => '<div class="story-card story-card--loading"></div>').join('');
}

function focusStoryOnMap(storyId, mapView) {
  const story = getDisplayedStories().find((item) => item.id === storyId);
  if (!story) {
    return;
  }

  mapView.focusStory(story);
}

function getDisplayedStories() {
  return state.storyFeed === 'saved' ? state.savedStories : state.stories;
}

function findStoryById(storyId) {
  return state.stories.find((story) => story.id === storyId) || state.savedStories.find((story) => story.id === storyId);
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

async function syncNotificationState() {
  if (!state.notificationsSupported) {
    return false;
  }

  try {
    const subscription = await getExistingSubscription();
    state.notificationsEnabled = Boolean(subscription);
    return state.notificationsEnabled;
  } catch {
    state.notificationsEnabled = false;
    return false;
  }
}

function updateNotificationButton(button) {
  if (!button) {
    return;
  }

  button.disabled = state.notificationBusy;
  if (state.notificationBusy) {
    button.textContent = 'Updating...';
    return;
  }

  button.textContent = state.notificationsEnabled ? 'Disable notifications' : 'Enable notifications';
}

function resolveHomeEmptyMessage(isSavedFeed, latestErrorMessage) {
  if (isSavedFeed) {
    return 'No saved stories yet. Save a story from the latest feed to keep it in IndexedDB.';
  }

  if (latestErrorMessage) {
    return latestErrorMessage;
  }

  return 'No stories available yet.';
}
