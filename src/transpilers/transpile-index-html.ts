import Mustache from 'mustache';

Mustache.escape = (text) => text; // NOTE: important to disable html escaping

export default function(htmlContent='', ENV={}, indexHTMLInjections={}) {
  if (ENV.memserver && ENV.memserver.enabled) {
    const htmlWithMemserver = htmlContent.replace(
      '<script src="/assets/vendor.js"></script>', `
      <script src="/assets/vendor.js"></script>
      <script src="/assets/memserver.js"></script>
    `);

    return Mustache.render(htmlWithMemserver, indexHTMLInjections);
  }

  return Mustache.render(htmlContent, indexHTMLInjections);
}
