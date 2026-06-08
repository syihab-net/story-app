import { api } from '../services/api.js';
import { authStore } from '../services/auth-store.js';
import { parseErrorMessage } from '../services/utils.js';
import { state } from '../state/app-state.js';
import { renderAuthLayout } from './layout.js';

export function renderLoginPage(root) {
  root.innerHTML = renderAuthLayout({
    title: 'Welcome back',
    subtitle: 'Sign in to explore the newest stories and add your own moment to the map.',
    formMarkup: `
      <div class="auth-card__header">
        <p class="muted-copy">Use your registered account to continue.</p>
      </div>
      <form class="form-stack auth-form" id="login-form">
        <label class="field" for="login-email">
          <span>Email address</span>
          <input id="login-email" name="email" type="email" autocomplete="email" required />
        </label>
        <label class="field" for="login-password">
          <span>Password</span>
          <input id="login-password" name="password" type="password" autocomplete="current-password" minlength="8" required />
        </label>
        <button class="primary-button primary-button--block" id="login-submit" type="submit">Sign in</button>
        <p class="form-feedback" id="login-feedback" role="status" aria-live="polite"></p>
      </form>
    `,
    footerMarkup: `
      <p class="auth-footer">
        Need an account?
        <a href="#/register">Create one here</a>
      </p>
    `,
  });

  const form = root.querySelector('#login-form');
  const feedback = root.querySelector('#login-feedback');
  const submitButton = root.querySelector('#login-submit');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Signing in...';
    feedback.className = 'form-feedback';
    feedback.textContent = '';

    try {
      const payload = Object.fromEntries(new FormData(form).entries());
      const response = await api.login(payload);
      authStore.setSession(response.loginResult);
      state.user = authStore.getUser();
      feedback.textContent = 'Login success. Redirecting...';
      feedback.classList.add('form-feedback--success');
      window.location.hash = '#/';
    } catch (error) {
      feedback.textContent = parseErrorMessage(error);
      feedback.classList.add('form-feedback--error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Sign in';
    }
  });
}

export function renderRegisterPage(root) {
  root.innerHTML = renderAuthLayout({
    title: 'Create Your Account',
    subtitle: 'Register once, then publish stories, explore the map, and manage your account from one place.',
    formMarkup: `
      <form class="form-stack auth-form" id="register-form">
        <label class="field" for="register-name">
          <span>Full name</span>
          <input id="register-name" name="name" type="text" autocomplete="name" minlength="3" required />
        </label>
        <label class="field" for="register-email">
          <span>Email address</span>
          <input id="register-email" name="email" type="email" autocomplete="email" required />
        </label>
        <label class="field" for="register-password">
          <span>Password</span>
          <input id="register-password" name="password" type="password" autocomplete="new-password" minlength="8" required />
        </label>
        <button class="primary-button primary-button--block" id="register-submit" type="submit">Create account</button>
        <p class="form-feedback" id="register-feedback" role="status" aria-live="polite"></p>
      </form>
    `,
    footerMarkup: `
      <p class="auth-footer">
        Already have an account?
        <a href="#/login">Sign in</a>
      </p>
    `,
  });

  const form = root.querySelector('#register-form');
  const feedback = root.querySelector('#register-feedback');
  const submitButton = root.querySelector('#register-submit');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitButton.disabled = true;
    submitButton.textContent = 'Creating account...';
    feedback.className = 'form-feedback';
    feedback.textContent = '';

    try {
      await api.register(Object.fromEntries(new FormData(form).entries()));
      feedback.textContent = 'Account created. Please sign in.';
      feedback.classList.add('form-feedback--success');
      form.reset();
      window.setTimeout(() => {
        window.location.hash = '#/login';
      }, 600);
    } catch (error) {
      feedback.textContent = parseErrorMessage(error);
      feedback.classList.add('form-feedback--error');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Create account';
    }
  });
}
