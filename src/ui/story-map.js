import L from 'leaflet';
import { escapeHtml } from '../services/utils';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const activeMarkerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [31, 51],
  iconAnchor: [15, 51],
  popupAnchor: [1, -42],
  shadowSize: [47, 47],
});

export function createStoryMap(element, options) {
  const {
    center,
    defaultZoom,
    tileLayers,
    clickable = false,
    onPick = null,
  } = options;

  const map = L.map(element, {
    zoomControl: false,
  }).setView(center, defaultZoom);

  const baseLayers = {
    Color: L.tileLayer(tileLayers.color.url, { attribution: tileLayers.color.attribution }),
    Toner: L.tileLayer(tileLayers.toner.url, { attribution: tileLayers.toner.attribution }),
  };

  baseLayers.Color.addTo(map);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.control.layers(baseLayers, null, { position: 'topright' }).addTo(map);

  const markers = new Map();
  let selectedMarker = null;
  let pickedMarker = null;

  if (clickable && onPick) {
    map.on('click', (event) => {
      if (!pickedMarker) {
        pickedMarker = L.marker(event.latlng, { icon: activeMarkerIcon }).addTo(map);
      } else {
        pickedMarker.setLatLng(event.latlng);
      }

      onPick(event.latlng);
    });
  }

  return {
    renderStories(stories, activeStoryId = null) {
      markers.forEach((marker) => marker.remove());
      markers.clear();

      const bounds = [];

      stories
        .filter((story) => typeof story.lat === 'number' && typeof story.lon === 'number')
        .forEach((story) => {
          const marker = L.marker([story.lat, story.lon], {
            icon: story.id === activeStoryId ? activeMarkerIcon : markerIcon,
          }).addTo(map);

          marker.bindPopup(`
            <article class="popup-card">
              <img src="${story.photoUrl}" alt="Story from ${escapeHtml(story.name)}" />
              <h2 class="popup-card__title">by ${escapeHtml(story.name)}</h2>
              <p>${escapeHtml(story.description)}</p>
            </article>
          `);

          markers.set(story.id, marker);
          bounds.push([story.lat, story.lon]);
        });

      if (bounds.length) {
        map.fitBounds(bounds, { padding: [40, 40] });
      } else {
        map.setView(center, defaultZoom);
      }
    },

    focusStory(story) {
      if (selectedMarker) {
        selectedMarker.setIcon(markerIcon);
      }

      const marker = markers.get(story.id);
      if (!marker) {
        return;
      }

      selectedMarker = marker;
      marker.setIcon(activeMarkerIcon);
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 8), {
        duration: 0.9,
      });
      marker.openPopup();
    },

    destroy() {
      map.remove();
    },
  };
}
