import { authStore } from '../services/auth-store.js';

export const state = {
  activeStoryId: null,
  stories: [],
  user: authStore.getUser(),
};
