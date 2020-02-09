import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root.js';
import transpileIndexHTML from '../transpilers/transpile-index-html.js';

export default function(htmlPath, buildConfig={
  applicationName: null,
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
  },
  cliArguments: {},
  ENV: {},
  indexHTMLInjections: {},
  projectRoot: null
}) {
  return new Promise(async (resolve, reject) => {
    const projectRoot = buildConfig.projectRoot || await findProjectRoot();
    const indexHTMLInjections = buildConfig.indexHTMLInjections || {};
    const ENV = buildConfig.ENV || {};

    fs.readFile(htmlPath).then((htmlBuffer) => {
      return fs.writeFile(
        `${projectRoot}/tmp/${ENV.documentation.path}.html`,
        transpileIndexHTML(addDocumentationAssets(htmlBuffer.toString()), ENV, indexHTMLInjections)
      );
    }).then(() => resolve(true))
      .catch((error) => {
        console.log('buildDocumentationHTML ERROR:', error);
        reject(error);
      });
  });
}

function addDocumentationAssets(htmlString) {
  return htmlString
    .replace('<link rel="stylesheet" href="/assets/application.css">',
  `<link rel="stylesheet" href="/assets/application.css">\n<link rel="stylesheet" href="/assets/documentation.css">`)
    .replace('<script src="/assets/application.js"></script>',
  `<script src="/assets/documentation.js"></script>\n<script src="/assets/application.js"></script>`);
}
