{{flutter_js}}
{{flutter_build_config}}

const trisafeStartupOverlay = document.getElementById('trisafe-loader');
const trisafeStartupMessage = document.getElementById('trisafe-loader-message');

function showTriSafeStartupError() {
  if (!trisafeStartupOverlay || !trisafeStartupMessage) return;
  trisafeStartupOverlay.classList.add('is-error');
  trisafeStartupMessage.textContent =
      'TriSafe could not start. Refresh the page or clear this site\'s cached data and try again.';
}

window.addEventListener('error', showTriSafeStartupError);
window.addEventListener('unhandledrejection', showTriSafeStartupError);

_flutter.loader.load({
  onEntrypointLoaded: async function (engineInitializer) {
    try {
      const appRunner = await engineInitializer.initializeEngine();
      await appRunner.runApp();
      trisafeStartupOverlay?.classList.add('is-ready');
      window.setTimeout(() => trisafeStartupOverlay?.remove(), 240);
    } catch (error) {
      console.error('TriSafe startup failed.', error);
      showTriSafeStartupError();
    }
  }
});
