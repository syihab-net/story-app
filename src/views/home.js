import { DEFAULT_CENTER, DEFAULT_ZOOM, TILE_LAYERS } from '../config/map.js';
import { api } from '../services/api.js';
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
            <h1>Latest stories</h1>
            <p class="muted-copy">Pick one card to focus its marker on the map.</p>
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
  const mapView = createStoryMap(mapElement, {
    center: DEFAULT_CENTER,
    defaultZoom: DEFAULT_ZOOM,
    tileLayers: TILE_LAYERS,
  });

  listElement.innerHTML = renderLoadingCards();

  try {
    const response = await api.getStories({ location: 1, page: 1, size: 99 });
    state.stories = response.listStory;
    state.activeStoryId = null;

    if (!state.stories.length) {
      listElement.innerHTML = '<div class="empty-state">No stories available yet.</div>';
      mapView.renderStories([]);
      return;
    }

    mapView.renderStories(state.stories);
    listElement.innerHTML = renderStoryList(state.stories, state.activeStoryId);

    listElement.addEventListener('click', (event) => {
      const focusButton = event.target.closest('[data-focus-story]');
      if (!focusButton) {
        return;
      }

      state.activeStoryId = focusButton.dataset.storyId;
      listElement.innerHTML = renderStoryList(state.stories, state.activeStoryId);
      mapView.renderStories(state.stories, state.activeStoryId);
      focusStoryOnMap(state.activeStoryId, mapView);
    });
  } catch (error) {
    listElement.innerHTML = `<div class="empty-state empty-state--error">${escapeHtml(parseErrorMessage(error))}</div>`;
  }
}

function renderStoryList(stories, activeStoryId) {
  return stories
    .map((story) => {
      const isActive = story.id === activeStoryId;
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
  const story = state.stories.find((item) => item.id === storyId);
  if (!story) {
    return;
  }

  mapView.focusStory(story);
}
