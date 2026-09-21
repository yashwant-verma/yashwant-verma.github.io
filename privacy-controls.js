// Uses Google's published CMP; does not set consent on behalf of visitors.
window.googlefc = window.googlefc || {};
window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
window.googlefc.callbackQueue.push({
  CONSENT_API_READY: () => {
    if (typeof window.googlefc.showRevocationMessage !== 'function') return;
    document.querySelectorAll('[data-privacy-settings]').forEach((button) => {
      button.hidden = false;
      button.addEventListener('click', () => {
        window.googlefc.callbackQueue.push({
          CONSENT_API_READY: () => window.googlefc.showRevocationMessage()
        });
      });
    });
  }
});
