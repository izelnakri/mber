/* eslint-env node */
const app = require('../index.js');

module.exports = function(environment) {
  // app.import();
  // app.importAddon();

  // app.import('node_modules/popper.js/dist/umd/popper.min.js', { type: 'vendor', using: [{ transformation: 'fastbootShim' }] });

  // if (environment.googleAnalytics.id) {
  //     app.options.inlineContent.googleAnalytics = {
  //       content: `
  //       <script>
  //         window.ga=window.ga||function(){(ga.q=ga.q||[]).push(arguments)};ga.l=+new Date;
  //         ga('create', '${environment.googleAnalytics.id}', 'auto');
  //       </script>
  //       <script async src='https://www.google-analytics.com/analytics.js'></script>`
  //     };
  //   }

  return app.build();
}
