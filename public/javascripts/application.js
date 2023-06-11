$(() => {
  // Panel component
  const panel = {
    panelElem: document.querySelector('.signatory-panel'),
    toggleElem: document.querySelector('.js-expand-signatories'),
    sortBy: null,
    sortOrder: 1,

    togglePanel() {
      const {panelElem, toggleElem} = this;

      // Get state of panel from the existence of "expanded" class
      const isExpanded = panelElem.classList.contains('expanded');

      // Toggle the panel "expanded" class
      panelElem.classList.toggle('expanded', !isExpanded);
      document.querySelector('.sort-controls').classList.toggle('hidden', isExpanded);

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
      const {panelElem, toggleElem} = this;

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
      toggleElem.addEventListener('click', () => {
        this.togglePanel();
      });

      document.querySelector('#sort-name').addEventListener('click', this.sort('name'));
      document.querySelector('#sort-date').addEventListener('click', this.sort('date'));
    }
  };
  panel.init();
});

