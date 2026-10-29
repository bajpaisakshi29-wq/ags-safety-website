/* Web3Forms: public form access key is supplied on each form, never a mail password. */
(function () {
  'use strict';
  var endpoint = 'https://api.web3forms.com/submit';
  var configs = [
    ['oemForm', 'oemStatus', 'SICURA — OEM enquiry'],
    ['overviewModalForm', 'overviewModalStatus', 'SICURA — Capability overview request'],
    ['sampleModalForm', 'sampleModalStatus', 'SICURA — Sample request']
  ];
  configs.forEach(function (config) {
    var form = document.getElementById(config[0]);
    var status = document.getElementById(config[1]);
    if (!form || !status) return;
    var pending = false;
    form.addEventListener('submit', async function (event) {
      event.preventDefault();
      if (pending || !form.reportValidity()) return;
      var data = new FormData(form);
      // Ignore filled honeypots without reporting a successful delivery.
      if (data.get('bot-field') || data.get('botcheck')) return;
      var key = data.get('access_key');
      if (!key || key === 'WEB3FORMS_ACCESS_KEY_PENDING') {
        status.textContent = 'Please email sales@sicura.in or use WhatsApp to send your request.';
        status.classList.add('visible');
        return;
      }
      pending = true;
      var button = form.querySelector('[type="submit"]');
      var originalLabel = button ? button.textContent : '';
      var controller = new AbortController();
      var timeout = setTimeout(function () { controller.abort(); }, 20000);
      status.textContent = 'Sending your request…';
      status.classList.add('visible', 'sending');
      if (button) { button.disabled = true; button.textContent = 'Sending…'; }
      try {
        var payload = {};
        data.forEach(function (value, name) {
          if (name !== 'bot-field' && name !== 'form-name') payload[name] = value;
        });
        payload.subject = config[2];
        payload.from_name = 'SICURA website';
        payload.enquiry_type = form.getAttribute('name');
        payload.source_url = window.location.origin + window.location.pathname;
        var response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        var result = await response.json();
        if (!response.ok || result.success !== true) throw new Error('Submission rejected');
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
