const SESSION_KEY = 'dicodingstory.session';

export const authStore = {
  getSession() {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  },

  getUser() {
    const session = this.getSession();

    if (!session) {
      return null;
    }

    return {
      name: session.name,
      token: session.token,
      userId: session.userId,
    };
  },

  setSession(payload) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  },

  clearSession() {
    localStorage.removeItem(SESSION_KEY);
  },
};
