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
    const outputPath = htmlPath.endsWith('tests/index.html') ?
      `${projectRoot}/tmp/tests.html` : `${projectRoot}/tmp/index.html`;

    fs.readFile(htmlPath).then((htmlBuffer) => {
      return fs.writeFile(
        outputPath,
        transpileIndexHTML(htmlBuffer.toString(), ENV, indexHTMLInjections)
      );
    }).then(() => resolve(true))
      .catch((error) => {
        console.log('buildIndexHTML ERROR:', error);
        reject(error);
      });
  });
}
