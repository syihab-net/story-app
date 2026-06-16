import { authStore } from '../services/auth-store.js';
import { isPushSupported } from '../services/notification.js';

export const state = {
  activeStoryId: null,
  notificationBusy: false,
  notificationsEnabled: false,
  notificationsSupported: isPushSupported(),
  savedStories: [],
  savedStoryIds: new Set(),
  storyFeed: 'latest',
  stories: [],
  user: authStore.getUser(),
};
