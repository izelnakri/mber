import app from 'mber';

export default function (ENV) {
  const { environment } = ENV;

  // app.import('node_modules/jquery/dist/jquery.min.js', {
  //   type: 'vendor', prepend: true
  // });
  app.importAddon('mber-head', { type: 'vendor' });
  // app.importAsAMDModule('moment', 'node_modules/moment/min/moment.min.js');
  // app.importAsAMDModule('bip39');

  if (environment !== 'production') {
    app.import('node_modules/qunit-dom/dist/qunit-dom.js', { type: 'test', prepend: true });
    app.import('vendor/shims/qunit-dom.js', { type: 'test', prepend: true });
  }

  if (ENV.googleAnalyticsId) {
    app.injectInlineContent(
      'googleAnalytics',
      `
      <script>
        window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
        ga('create', '${ENV.googleAnalyticsId}', 'auto');
      </script>
      <script async src='https://www.google-analytics.com/analytics.js'></script>
    `
    );
  }

  return app.build(environment);
}
