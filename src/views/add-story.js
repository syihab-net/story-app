import { DEFAULT_CENTER, DEFAULT_ZOOM, TILE_LAYERS } from '../config/map.js';
import { api } from '../services/api.js';
import { escapeHtml, imageFileToDataUrl, parseErrorMessage, resizeImageFile } from '../services/utils.js';
import { state } from '../state/app-state.js';
import { createStoryMap } from '../ui/story-map.js';
import { renderShell } from './layout.js';

export async function renderAddStoryPage(root) {
  root.innerHTML = renderShell(
    `
    <section class="form-page form-page--single">
      <div class="panel form-page__body">
        <div class="form-page__header">
          <h1>Add Story</h1>
          <p class="muted-copy">
            Upload one image, write a clear description, then pick a map point by clicking the map.
          </p>
        </div>
        <form class="story-form" id="story-form">
          <label class="field" for="story-description">
            <span>Description</span>
            <textarea id="story-description" name="description" rows="5" minlength="8" maxlength="500" required></textarea>
          </label>
          <label class="field" for="photo-input">
            <span>Photo upload</span>
            <input id="photo-input" name="photo" type="file" accept="image/*" />
          </label>
          <div class="media-preview" id="media-preview" aria-live="polite">
            <p class="muted-copy">No image selected yet.</p>
          </div>
          <div class="camera-block">
            <button class="secondary-button" type="button" id="camera-toggle">Use camera</button>
            <video id="camera-preview" class="camera-preview" playsinline muted hidden aria-label="Camera preview"></video>
            <div class="camera-actions" hidden id="camera-actions">
              <button class="secondary-button" type="button" id="capture-photo">Capture photo</button>
              <button class="ghost-button" type="button" id="stop-camera">Stop camera</button>
            </div>
          </div>
          <div class="visually-hidden" aria-hidden="true">
            <div class="coordinates-grid">
              <label class="field" for="lat-input">
                <span>Latitude</span>
                <input name="lat" id="lat-input" type="number" step="any" required readonly />
              </label>
              <label class="field" for="lon-input">
                <span>Longitude</span>
                <input name="lon" id="lon-input" type="number" step="any" required readonly />
              </label>
            </div>
          </div>
          <div class="field">
            <span>Location</span>
          </div>
          <div class="picker-panel">
            <span class="muted-copy">Click the map to set your story location.</span>
            <div class="picker-panel__map" id="picker-map" aria-label="Map for picking story coordinates"></div>
          </div>
          <button class="primary-button primary-button--block" id="story-submit" type="submit">Publish story</button>
          <p class="form-feedback" id="story-feedback" role="status" aria-live="polite"></p>
        </form>
      </div>
    </section>
  `,
    { pageClass: 'app-shell--workspace', hideFooter: true },
  );

  const form = root.querySelector('#story-form');
  const feedback = root.querySelector('#story-feedback');
  const submitButton = root.querySelector('#story-submit');
  const latInput = root.querySelector('#lat-input');
  const lonInput = root.querySelector('#lon-input');
  const photoInput = root.querySelector('#photo-input');
  const mediaPreview = root.querySelector('#media-preview');
  const cameraToggle = root.querySelector('#camera-toggle');
  const cameraPreview = root.querySelector('#camera-preview');
  const cameraActions = root.querySelector('#camera-actions');
  const capturePhoto = root.querySelector('#capture-photo');
  const stopCamera = root.querySelector('#stop-camera');

  const pickerMap = createStoryMap(root.querySelector('#picker-map'), {
    center: DEFAULT_CENTER,
    defaultZoom: DEFAULT_ZOOM,
    tileLayers: TILE_LAYERS,
    clickable: true,
    onPick: ({ lat, lng }) => {
      latInput.value = lat.toFixed(6);
      lonInput.value = lng.toFixed(6);
    },
  });

  let capturedFile = null;
  let mediaStream = null;

  photoInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      capturedFile = null;
      mediaPreview.innerHTML = '<p class="muted-copy">No image selected yet.</p>';
      return;
    }

    try {
      capturedFile = await resizeImageFile(file);
      mediaPreview.innerHTML = `<img src="${await imageFileToDataUrl(capturedFile)}" alt="Selected story preview" />`;
    } catch (error) {
      capturedFile = null;
      photoInput.value = '';
      mediaPreview.innerHTML = `<p class="muted-copy form-feedback--error">${escapeHtml(parseErrorMessage(error))}</p>`;
    }
  });

  cameraToggle.addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      feedback.textContent = 'Camera access is not available in this browser.';
      feedback.className = 'form-feedback form-feedback--error';
      return;
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      cameraPreview.srcObject = mediaStream;
      cameraPreview.hidden = false;
      cameraActions.hidden = false;
      await cameraPreview.play();
      feedback.textContent = 'Camera ready. Capture a photo when you are set.';
      feedback.className = 'form-feedback form-feedback--success';
    } catch (error) {
      feedback.textContent = parseErrorMessage(error);
      feedback.className = 'form-feedback form-feedback--error';
    }
  });

  capturePhoto.addEventListener('click', async () => {
    if (!mediaStream) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = cameraPreview.videoWidth;
    canvas.height = cameraPreview.videoHeight;
    canvas.getContext('2d').drawImage(cameraPreview, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });

    if (!blob) {
      feedback.textContent = 'Unable to capture image from camera.';
      feedback.className = 'form-feedback form-feedback--error';
      return;
    }

    const file = new File([blob], `camera-story-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    });
    capturedFile = await resizeImageFile(file);
    mediaPreview.innerHTML = `<img src="${await imageFileToDataUrl(capturedFile)}" alt="Captured story preview" />`;
    feedback.textContent = 'Photo captured from camera.';
    feedback.className = 'form-feedback form-feedback--success';
    stopActiveStream(mediaStream);
    mediaStream = null;
    cameraPreview.hidden = true;
    cameraActions.hidden = true;
  });

  stopCamera.addEventListener('click', () => {
    stopActiveStream(mediaStream);
    mediaStream = null;
    cameraPreview.hidden = true;
    cameraActions.hidden = true;
    feedback.textContent = 'Camera stopped.';
    feedback.className = 'form-feedback';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Publishing story...';
    feedback.textContent = '';
    feedback.className = 'form-feedback';

    try {
      const formData = new FormData(form);
      const description = formData.get('description')?.toString().trim();
      const lat = Number(latInput.value);
      const lon = Number(lonInput.value);

      if (!capturedFile) {
        throw new Error('Please upload or capture an image first.');
      }

      if (!latInput.value || !lonInput.value || Number.isNaN(lat) || Number.isNaN(lon)) {
        throw new Error('Please click the map to choose a story location first.');
      }

      await api.addStory({
        description,
        lat,
        lon,
        photo: capturedFile,
      });

      state.stories = [];
      feedback.textContent = 'Story published successfully.';
      feedback.className = 'form-feedback form-feedback--success';
      form.reset();
      latInput.value = '';
      lonInput.value = '';
      mediaPreview.innerHTML = '<p class="muted-copy">No image selected yet.</p>';
      capturedFile = null;
      window.setTimeout(() => {
        window.location.hash = '#/';
      }, 700);
    } catch (error) {
      feedback.textContent = parseErrorMessage(error);
      feedback.className = 'form-feedback form-feedback--error';
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Publish story';
    }
  });

  window.addEventListener(
    'hashchange',
    () => {
      pickerMap.destroy();
      stopActiveStream(mediaStream);
    },
    { once: true },
  );
}

function stopActiveStream(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}
