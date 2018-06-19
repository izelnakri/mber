import Mustache from 'mustache';

Mustache.escape = (text) => text; // NOTE: important to disable html escaping

export default function(htmlContent='', buildMetaConfig={}) {
  return Mustache.render(htmlContent, buildMetaConfig.indexHTMLInjections);
}
