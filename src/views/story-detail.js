import { api } from '../services/api.js';
import { escapeHtml, formatDate, parseErrorMessage } from '../services/utils.js';
import { renderShell, getInitials } from './layout.js';

export async function renderStoryDetailPage(root, storyId) {
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
    const response = await api.getStoryDetail(storyId);
    const story = response.story;

    detailCard.innerHTML = `
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
      </div>
      <img class="detail-card__image" src="${escapeHtml(story.photoUrl)}" alt="Story from ${escapeHtml(story.name)}" />
      <div class="detail-card__author-row">
        <span class="detail-card__avatar">${getInitials(story.name)}</span>
        <div class="detail-card__author-copy">
          <p class="detail-card__author-name">${escapeHtml(story.name)}</p>
          <p class="detail-card__date">${formatDate(story.createdAt)}</p>
        </div>
      </div>
      <p class="detail-card__description">${escapeHtml(story.description)}</p>
    `;
  } catch (error) {
    detailCard.innerHTML = `
      <p class="form-feedback form-feedback--error">${escapeHtml(parseErrorMessage(error))}</p>
      <a class="secondary-button" href="#/">Back to Home</a>
    `;
  }
}
