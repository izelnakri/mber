import fs from 'fs-extra';
import findProjectRoot from '../utils/find-project-root';
import transpileIndexHTML from '../transpilers/transpile-index-html';

export default function(htmlPath, buildConfig={
  applicationName: null,
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
  },
  cliArguments: {},
  ENV: {},
  indexHTMLInjections: {},
  projectRoot: null,
  testing: false
}) {
  return new Promise(async (resolve, reject) => {
    const projectRoot = buildConfig.projectRoot || await findProjectRoot();
    const indexHTMLInjections = buildConfig.indexHTMLInjections || {};
    const ENV = buildConfig.ENV || {};
    const OUTPUT_PATH = htmlPath.endsWith('tests/index.html') ?
      `${projectRoot}/tmp/tests.html` : `${projectRoot}/tmp/index.html`;

    fs.readFile(htmlPath).then((htmlBuffer) => {
      // TODO: change the output path
      return fs.writeFile(
        OUTPUT_PATH,
        transpileIndexHTML(htmlBuffer.toString(), ENV, indexHTMLInjections)
      );
    }).then(() => resolve(true))
      .catch((error) => {
        console.log('buildIndexHTML ERROR:', error);
        reject(error);
      });
  });
}
