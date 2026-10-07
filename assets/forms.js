/* Netlify Forms: enable form detection and redeploy before accepting enquiries. */
(function () {
  'use strict';
  var configs = [
    ['oemForm', 'oemStatus'],
    ['overviewModalForm', 'overviewModalStatus'],
    ['sampleModalForm', 'sampleModalStatus']
  ];
  configs.forEach(function (config) {
    var form = document.getElementById(config[0]);
    var status = document.getElementById(config[1]);
    if (!form || !status) return;
    var pending = false;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (pending || !form.reportValidity()) return;
      pending = true;
      var button = form.querySelector('[type="submit"]');
      var originalLabel = button ? button.textContent : '';
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 20000);
      status.textContent = 'Sending your request…';
      status.classList.add('visible', 'sending');
      if (button) { button.disabled = true; button.textContent = 'Sending…'; }
      try {
        if (window.location.protocol === 'file:') throw new Error('Hosting required');
        var data = new FormData(form);
        data.set('form-name', form.getAttribute('name'));
        var response = await fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams(data).toString(),
          signal: controller.signal
        });
        if (!response.ok) throw new Error('Submission rejected');
        status.textContent = status.getAttribute('data-confirm');
        form.reset();
      } catch (error) {
        status.textContent = error.name === 'AbortError'
          ? 'We could not confirm delivery. Please contact sales@sicura.in or use WhatsApp.'
          : 'Your request could not be sent. Please retry, email sales@sicura.in or use WhatsApp.';
      } finally {
        clearTimeout(timeout);
        pending = false;
        status.classList.remove('sending');
        if (button) { button.disabled = false; button.textContent = originalLabel; }
      }
    });
  });
})();
