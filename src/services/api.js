const BASE_URL = 'https://story-api.dicoding.dev/v1';

async function request(path, { method = 'GET', headers = {}, body, token } = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body,
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

export const api = {
  register(payload) {
    return request('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  login(payload) {
    return request('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },

  getStories({ location = 1, page = 1, size = 20 } = {}) {
    const token = JSON.parse(localStorage.getItem('dicodingstory.session') || 'null')?.token;
    const params = new URLSearchParams({
      location: String(location),
      page: String(page),
      size: String(size),
    });

    return request(`/stories?${params.toString()}`, { token });
  },

  getStoryDetail(id) {
    const token = JSON.parse(localStorage.getItem('dicodingstory.session') || 'null')?.token;
    return request(`/stories/${id}`, { token });
  },

  addStory({ description, photo, lat, lon }) {
    const token = JSON.parse(localStorage.getItem('dicodingstory.session') || 'null')?.token;
    const formData = new FormData();
    formData.append('description', description);
    formData.append('photo', photo);
    formData.append('lat', String(lat));
    formData.append('lon', String(lon));

    return request('/stories', {
      method: 'POST',
      body: formData,
      token,
    });
  },

  subscribeNotification(payload) {
    const token = JSON.parse(localStorage.getItem('dicodingstory.session') || 'null')?.token;
    return request('/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      token,
    });
  },

  unsubscribeNotification(payload) {
    const token = JSON.parse(localStorage.getItem('dicodingstory.session') || 'null')?.token;
    return request('/notifications/subscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      token,
    });
  },
};
