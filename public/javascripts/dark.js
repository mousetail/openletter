$(() => {
  // Switcher component
  const switcher = {
    darkModeKey: 'darkMode',
    darkMode: window.matchMedia('(prefers-color-scheme:dark)').matches,

    init() {
      // Fetch dark mode preference from local storage
      try {
        const stored = window.localStorage.getItem(this.darkModeKey);

        if (stored !== null) {
          const darkMode = stored === 'true';
          this.switchMode(darkMode);
        }
      } catch (e) {
        // ignore
      }

      // Add event listener to toggle dark mode
      document.addEventListener('click', evt => {
        if (evt.target?.classList.contains('color-mode-toggle')) {
          this.toggleDarkMode();
        }
      });
    },

    switchMode(darkMode) {
      const link = document.querySelector('link[href*="dark.css"]');

      if (link) {
        link.disabled = !darkMode;
      }

      this.darkMode = darkMode;

      // Save dark mode preference to local storage
      try {
        window.localStorage.setItem(this.darkModeKey, this.darkMode);
      } catch (e) {
        // ignore
      }
    },

    toggleDarkMode() {
      this.switchMode(!this.darkMode);
    }
  };
  
  switcher.init();
})