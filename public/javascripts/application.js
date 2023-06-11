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
  // This script should be placed in the document head, after the dark mode stylesheet, and without the jQuery ready function
  switcher.init();


  // Panel component
  const panel = {
    sortBy: null,
    sortOrder: 1,

    togglePanel() {
      const { sectionElem, toggleElem } = this;

      // Get state of panel from the existence of "expanded" class on the section
      const isExpanded = sectionElem.classList.contains('expanded');

      // Toggle the "expanded" class on the section
      sectionElem.classList.toggle('expanded', !isExpanded);

      // Toggle the link text
      toggleElem.innerHTML = isExpanded ? toggleElem.dataset.originalHtml : 'Collapse <i class="fa-arrow-up fas"></i>';
    },

    sort(by) {
      const sortFunction = {
        date(elem) {
          return new Date(elem.querySelector('small').dataset.originalCreatedAt).toISOString();
        },
        name(elem) {
          return elem.querySelector('a').textContent.trim();
        }
      }[by];

      return ev => {
        const target = ev.currentTarget;

        if (this.sort === by) {
          this.sortOrder = -this.sortOrder;
        } else {
          this.sort = by;
        }

        // Clear selected class from sort buttons
        document.querySelectorAll('.sort-controls .btn').forEach(i => i.classList.remove('btn-info'));

        // Add selected class to clicked button
        target.classList.add('btn-info');

        const icon = target.querySelector('i.fas');
        icon.classList.toggle('fa-arrow-down', this.sortOrder === 1);
        icon.classList.toggle('fa-arrow-up', this.sortOrder === -1);

        const taggedChildren = [...this.panelElem.children].map(
          i => [i, sortFunction(i)]
        );
        taggedChildren.sort((a, b) => this.sortOrder * a[1].localeCompare(b[1]));
        this.panelElem.replaceChildren(...taggedChildren.map(i => i[0]));
      };
    },

    init() {
      // These elements weren't available when the object was created, so we need to set them here
      this.sectionElem = document.querySelector('.signatories');
      this.panelElem = document.querySelector('.signatory-panel');
      this.toggleElem = document.querySelector('.js-expand-signatories');

      // The elements should exist
      const { sectionElem, panelElem, toggleElem } = this;
      if (!sectionElem || !panelElem || !toggleElem) {
        console.error('Missing required elements for panel.init()');
        return;
      }

      // Store original text and signatory count
      toggleElem.dataset.originalHtml = toggleElem.innerHTML;

      // Not necessary at the moment, but could be useful in the future
      sectionElem.dataset.count = panelElem.children.length;

      // Add event listener to link
      toggleElem.addEventListener('click', () => {
        this.togglePanel();
      });

      document.querySelector('#sort-name').addEventListener('click', this.sort('name'));
      document.querySelector('#sort-date').addEventListener('click', this.sort('date'));
    }
  };

  // Callback when document is ready
  const appInit = () => {
    panel.init();

    document.querySelector('.color-mode-toggle').addEventListener('click', () => {
      switcher.toggleDarkMode();
    });
  };

  // On document ready, or immediately if already loaded
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => appInit()) : appInit();
})();
