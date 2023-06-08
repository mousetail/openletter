$(() => {
  const darkModeKey = 'darkMode';

  let expanded = false;
  let text;

  const switcher = {
    darkMode: window.matchMedia('(prefers-color-scheme:dark)').matches,
    init() {
      // Fetch dark mode preference from local storage
      try {
        const stored = window.localStorage.getItem(darkModeKey);

        if (stored !== null) {
          const darkMode = stored === 'true';
          this.switchMode(darkMode);
        }
      } catch (e) {
        // ignore
      }

      // Add event listener to toggle dark mode
      $(document).on('click', '.color-mode-toggle', () => {
        this.toggleDarkMode();
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
        window.localStorage.setItem(darkModeKey, this.darkMode);
      } catch (e) {
        // ignore
      }
    },
    toggleDarkMode() {
      this.switchMode(!this.darkMode);
    }
  };

  switcher.init();

  // Toggle signatory panel
  $('.js-expand-signatories').on('click', evt => {
    if (expanded) {
      $('.signatory-panel, .shadow').css({
        'max-height': '30em',
        'overflow-y': 'scroll'
      });
      $(evt.target).html(text);
    }
    else {
      text = $(evt.target).html();
      $('.signatory-panel, .shadow').css({
        'max-height': 'unset',
        'overflow-y': 'hidden'
      });
      $(evt.target).html('Contract &uarr;');
    }
    expanded = !expanded;
    return false;
  });
});
