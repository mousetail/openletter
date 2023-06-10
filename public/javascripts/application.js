(() => {

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
      } catch (e) { } // ignore ls errors
    },

    switchMode(darkMode) {
      const link = document.querySelector('link[href*="dark.css"]');
      if (!link) return; // no dark mode stylesheet, can't toggle

      link.disabled = !darkMode;
      this.darkMode = darkMode;

      // Save dark mode preference to local storage
      try {
        window.localStorage.setItem(this.darkModeKey, this.darkMode);
      } catch (e) { } // ignore ls errors
    },

    toggleDarkMode() {
      this.switchMode(!this.darkMode);
    }
  };
  // Init immediately before page load to avoid light mode FOUC
  // This script should be placed in the document head, after the dark mode stylesheet
  switcher.init();


  // Panel component
  const panel = {
    panelElem: document.querySelector('.signatory-panel'),
    toggleElem: document.querySelector('.js-expand-signatories'),

    togglePanel() {
      const { panelElem, toggleElem } = this;

      // Get state of panel from the existence of "expanded" class
      const isExpanded = panelElem.classList.contains('expanded');

      // Toggle the panel "expanded" class
      panelElem.classList.toggle('expanded', !isExpanded);

      // Toggle the link text
      toggleElem.innerHTML = isExpanded ? toggleElem.dataset.originalHtml : 'Collapse <i class="fa-arrow-up fas"></i>';
    },

    init() {
      const { panelElem, toggleElem } = this;

      // Both panel or toggle element must exist
      if (!panelElem || !toggleElem) {
        console.error('Missing panel or toggle element');
        return;
      }

      // Store original text and signatory count
      toggleElem.dataset.originalHtml = toggleElem.innerHTML;

      // Not necessary at the moment, but could be useful in the future
      toggleElem.dataset.count = panelElem.children.length;
      panelElem.dataset.count = panelElem.children.length;

      // Add event listener to link
      toggleElem.addEventListener('click', evt => {
        this.togglePanel();
      });
    }
  };


  // On document ready
  document.addEventListener('DOMContentLoaded', () => {

    // Initialize panel
    panel.init();

    // Add event listener to header for dark mode toggle
    document.querySelector('header').addEventListener('click', evt => {
      if (evt.target.classList.contains('color-mode-toggle')) {
        switcher.toggleDarkMode();
      }
    });
  });

})();