/* eslint-env node */
const app = require('../index.js');

module.exports = function(ENV) {
  const { environment } = ENV;

  app.importAddon('mber-head', { type: 'vendor' });

  if (environment !== 'production') {
    app.importAddon('ember-devtools', { type: 'vendor' }); // TODO: ember-data not imported correctly    
  }

  if (ENV.googleAnalyticsId) {
    app.injectInlineContent('googleAnalytics', `
      <script>
        window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
        ga('create', '${ENV.googleAnalyticsId}', 'auto');
      </script>
      <script async src='https://www.google-analytics.com/analytics.js'></script>
    `);
  }

  return app.build(environment);
}
