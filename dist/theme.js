const THEME_STORAGE_KEY = 'portal-eventos-theme';

function preferredTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
  if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.content = theme === 'dark' ? '#07111f' : '#0f172a';
  const button = document.querySelector('#theme-toggle');
  if (!button) return;
  const dark = theme === 'dark';
  button.setAttribute('aria-pressed', String(dark));
  button.setAttribute('aria-label', dark ? 'Ativar modo claro' : 'Ativar modo escuro');
  button.title = dark ? 'Ativar modo claro' : 'Ativar modo escuro';
  button.querySelector('.theme-toggle-label').textContent = dark ? 'Modo claro' : 'Modo escuro';
  button.querySelector('.theme-toggle-icon').textContent = dark ? '☀' : '☾';
}

applyTheme(preferredTheme());

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.header-inner');
  if (!header) return;
  const button = document.createElement('button');
  button.id = 'theme-toggle';
  button.className = 'theme-toggle';
  button.type = 'button';
  button.innerHTML = '<span class="theme-toggle-icon" aria-hidden="true"></span><span class="theme-toggle-label"></span>';
  header.insertBefore(button, header.lastElementChild);
  applyTheme(document.documentElement.dataset.theme || preferredTheme());
  button.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  });
});
