import { getSavedStory } from '../services/idb.js';
import { api } from '../services/api.js';
import { escapeHtml, formatDate, parseErrorMessage } from '../services/utils.js';
import { state } from '../state/app-state.js';
import { getInitials, renderShell } from './layout.js';

export async function renderStoryDetailPage(root, storyId, helpers) {
  const { setSavedStories, toggleSavedStory } = helpers;

  root.innerHTML = renderShell(
    `
    <section class="detail-layout">
      <div class="panel detail-card" id="detail-card">
        <p class="story-meta">Loading story detail...</p>
      </div>
    </section>
  `,
    { pageClass: 'app-shell--workspace', hideFooter: true },
  );

  const detailCard = root.querySelector('#detail-card');

  try {
    let story;
    let offlineCopy = false;
    const existingSavedCopy = await getSavedStory(storyId);
    if (existingSavedCopy && !state.savedStoryIds.has(storyId)) {
      setSavedStories([existingSavedCopy, ...state.savedStories.filter((item) => item.id !== storyId)]);
    }

    try {
      story = (await api.getStoryDetail(storyId)).story;
    } catch (error) {
      story = existingSavedCopy;
      offlineCopy = Boolean(story);
      if (!story) {
        throw error;
      }
    }

    const paint = (message = '', tone = '') => {
      const isSaved = state.savedStoryIds.has(story.id);
      detailCard.innerHTML = renderDetailStory(story, { isSaved, message, offlineCopy, tone });

      detailCard.querySelector('[data-action="toggle-save-detail"]')?.addEventListener('click', async () => {
        const saveButton = detailCard.querySelector('[data-action="toggle-save-detail"]');
        saveButton.disabled = true;

        try {
          const result = await toggleSavedStory(story);
          paint(result.message, 'success');
        } catch (error) {
          paint(parseErrorMessage(error), 'error');
        }
      });
    };

    paint();
  } catch (error) {
    detailCard.innerHTML = `
      <p class="form-feedback form-feedback--error">${escapeHtml(parseErrorMessage(error))}</p>
      <a class="secondary-button" href="#/">Back to Home</a>
    `;
  }
}

function renderDetailStory(story, { isSaved, message, offlineCopy, tone }) {
  return `
    <div class="detail-card__headline">
      <a
        class="detail-card__back"
        href="#/"
        title="Back to Home"
        aria-label="Back to Home"
      >
        <span aria-hidden="true">&larr;</span>
      </a>
      <h1 class="detail-card__title">Story Detail</h1>
      <button
        class="secondary-button secondary-button--compact detail-card__save-toggle"
        type="button"
        data-action="toggle-save-detail"
      >
        ${isSaved ? 'Remove saved copy' : 'Save offline copy'}
      </button>
    </div>
    ${
      offlineCopy
        ? '<p class="story-meta story-meta--offline">Showing your saved offline copy because the API is unavailable.</p>'
        : ''
    }
    <img class="detail-card__image" src="${escapeHtml(story.photoUrl)}" alt="Story from ${escapeHtml(story.name)}" />
    <div class="detail-card__author-row">
      <span class="detail-card__avatar">${getInitials(story.name)}</span>
      <div class="detail-card__author-copy">
        <p class="detail-card__author-name">${escapeHtml(story.name)}</p>
        <p class="detail-card__date">${formatDate(story.createdAt)}</p>
      </div>
    </div>
    <p class="detail-card__description">${escapeHtml(story.description)}</p>
    <p class="form-feedback ${tone ? `form-feedback--${tone}` : ''}">${escapeHtml(message)}</p>
  `;
}
