import crypto from 'crypto';
import chalk from 'chalk';
import cheerio from 'cheerio';
import fs from 'fs-extra';
import buildFastbootPackageJSON from './build-fastboot-package-json';
import transpileIndexHTML from '../transpilers/transpile-index-html';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import { reportFile } from '../utils/asset-reporter';

const ABSOLUTE_URL_REGEX = new RegExp('^(?:[a-z]+:)?//', 'i');

export default function(buildConfig={
  applicationName: null,
  buildCache: {
    vendorAppends: '', vendorPrepends: '', applicationAppends: '', applicationPrepends: ''
  },
  cliArguments: null,
  ENV: null,
  indexHTMLInjections: {},
  projectRoot: null
}) {
  return new Promise(async (resolve) => {
    const spinner = Console.spinner(`${chalk.yellow('BUNDLING')}: ${buildConfig.applicationName}...\n`);
    const CLI_ARGUMENTS = buildConfig.cliArguments || {
      fastboot: true, port: 1234, socketPort: 1234, testing: true
    };
    const PROJECT_ROOT = buildConfig.projectRoot || await findProjectRoot();
    const ENV = buildConfig.ENV || { environment: 'development', modulePrefix: 'frontend' };
    const OUTPUT_DIRECTORY = `${PROJECT_ROOT}/dist`;
    const timer = countTime();
    const shouldBuildTests = (ENV.environment !== 'production') && CLI_ARGUMENTS.testing;
    const shouldBuildDocumentation = ENV.documentation && ENV.documentation.enabled;

    return Promise.all([
      fs.readFile(`${PROJECT_ROOT}/index.html`),
      shouldBuildTests ? fs.readFile(`${PROJECT_ROOT}/tests/index.html`) : null,
      shouldBuildDocumentation ?
        fs.readFile(`${PROJECT_ROOT}/tmp/${ENV.documentation.path}.html`) : null,
      resetDistFolder(OUTPUT_DIRECTORY)
    ]).then(([indexHTMLBuffer, testHTMLBuffer, documentationHTMLBuffer]) => {
      const transpiledHTMLBuffer = transpileIndexHTML(indexHTMLBuffer.toString(), ENV, buildConfig.indexHTMLInjections);
      const transpiledTestHTMLBuffer = testHTMLBuffer && transpileIndexHTML(testHTMLBuffer.toString(), ENV, buildConfig.indexHTMLInjections);
      const indexHTMLContent = transpiledHTMLBuffer.toString();
      const documentationHTMLContent = shouldBuildDocumentation ?
        documentationHTMLBuffer.toString() : null;
      const initialAssets = shouldBuildDocumentation ?
        findInternalAssetsFromHTML(PROJECT_ROOT, documentationHTMLContent) :
        findInternalAssetsFromHTML(PROJECT_ROOT, indexHTMLContent);
      const testsHTMLContent = testHTMLBuffer && transpiledTestHTMLBuffer.toString();
      const testAssets = findInternalAssetsFromHTML(PROJECT_ROOT, testsHTMLContent); // NOTE: assumes assets exist in /tmp directory

      // TODO: this should change
      const targetAssets = (shouldBuildTests ? initialAssets.concat(testAssets) : initialAssets)
        .filter((element, index, array) => index === array.indexOf(element));

      Promise.all(targetAssets.map((filePath) => fs.readFile(filePath))).then((fileContents) => {
        const assetMap = fileContents.reduce((result, fileContent, index) => {
          return Object.assign(result, { [targetAssets[index]]: fileContent });
        }, {});

        return Promise.all([
          hashAssets(PROJECT_ROOT, assetMap),
          fs.copy(`${PROJECT_ROOT}/public`, OUTPUT_DIRECTORY)
        ]);
      }).then(([[assetMap, hashedAssetMap]]) => {
        return Promise.all([
          writeAssetMap(PROJECT_ROOT, hashedAssetMap),
          CLI_ARGUMENTS.fastboot ? buildFastbootPackageJSON(hashedAssetMap, buildConfig, 'dist') : null,
          rewriteHTML(indexHTMLContent, hashedAssetMap, `${OUTPUT_DIRECTORY}/index.html`),
          shouldBuildDocumentation ?
            rewriteHTML(
              documentationHTMLContent,
              hashedAssetMap,
              `${OUTPUT_DIRECTORY}/${ENV.documentation.path}.html`
            ) : '',
          testsHTMLContent ?
            rewriteHTML(testsHTMLContent, hashedAssetMap, `${OUTPUT_DIRECTORY}/tests.html`) : null
        ].concat(targetAssets.map((asset) => {
          return safeRewrite({
            fileName: asset,
            fileContent: assetMap[asset],
            projectRoot: PROJECT_ROOT,
            outputDirectory: OUTPUT_DIRECTORY
          }, hashedAssetMap);
        })));
      }).then(async () => {
        spinner.stop();

        const TIME_SPENT = `${timer.stop()}ms`;

        Console.log(`${chalk.green('BUNDLED')}: ${buildConfig.applicationName} in ${chalk.yellow(TIME_SPENT)}`);

        const outputDirectory = OUTPUT_DIRECTORY.slice(PROJECT_ROOT.length + 1);

        console.log(chalk.green(`Built project successfully. Stored in "./${outputDirectory}":`));

        const dist = await fs.readdir(`${OUTPUT_DIRECTORY}/assets`);
        const result = await Promise.all(
          dist.filter((file) => file.endsWith('.js') || file.endsWith('.css'))
            .map((fileName) => reportFile(`${OUTPUT_DIRECTORY}/assets/${fileName}`))
        );

        resolve(result);
      }).catch(reportErrorAndExit);
    }).catch(reportErrorAndExit);
  });
}

function resetDistFolder(OUTPUT_DIRECTORY) {
  return new Promise((resolve, reject) => {
    fs.remove(OUTPUT_DIRECTORY)
      .then(() => fs.mkdir(OUTPUT_DIRECTORY))
      .then(() => fs.mkdir(`${OUTPUT_DIRECTORY}/assets`))
      .then(() => resolve())
      .catch((error) => reject(error));
  })
}

function findInternalAssetsFromHTML(projectRoot, htmlContent) {
  const $ = cheerio.load(htmlContent);
  const internalJSFiles = $('script[src]').toArray()
    .map((scriptNode) => $(scriptNode).attr('src'))
    .filter((uri) => !ABSOLUTE_URL_REGEX.test(uri));
  const internalCSSFiles = $('link[href]').toArray()
    .map((scriptNode) => $(scriptNode).attr('href'))
    .filter((uri) => !ABSOLUTE_URL_REGEX.test(uri));

  return internalCSSFiles.concat(internalJSFiles)
    .map((fileReferencePath) => fileReferencePath.replace('/assets', `${projectRoot}/tmp/assets`));
}

function hashAssets(PROJECT_ROOT, assetMap) {
  return new Promise((resolve) => {
    resolve([
      assetMap, Object.keys(assetMap).reduce((result, assetName) => {
        const fileName = assetName.replace(`${PROJECT_ROOT}/tmp/`, '');
        const hashedName = hashFile(fileName, assetMap[assetName]);

        return Object.assign(result, { [fileName]: hashedName });
      }, {})
    ]);
  });
}

function hashFile(fileName, content) {
  const name = fileName.slice(0, fileName.lastIndexOf('.'));

  return `${name}-${MD5Hash(content)}${fileName.slice(name.length, fileName.length)}`;
}

function MD5Hash(buf) {
  let md5 = crypto.createHash('md5');

  md5.update(buf);

  return md5.digest('hex');
}

function safeRewrite({ fileName, fileContent, projectRoot, outputDirectory }, assetMap) { // NOTE: in future we can do safe rewrite here
  const referenceName = fileName.replace(`${projectRoot}/`, '')
    .replace('tmp/', '');

  return fs.writeFile(`${outputDirectory}/${assetMap[referenceName]}`, fileContent);
}

function writeAssetMap(PROJECT_ROOT, hashedAssetMap) {
  return fs.writeFile(`${PROJECT_ROOT}/dist/assets/assetMap.json`, JSON.stringify({
    assets: Object.assign(hashedAssetMap, { 'assets/assetMap.json': 'assets/assetMap.json' }),
    prepend: ''
  }, null, 2));
}

function rewriteHTML(htmlContent, hashedAssetMap, outputPath) {
  const content = Object.keys(hashedAssetMap).reduce((result, baseAssetName) => {
    return result.replace(baseAssetName, hashedAssetMap[baseAssetName]);
  }, htmlContent);

  return fs.writeFile(outputPath, content);
}

function reportErrorAndExit(error) {
  Console.log(chalk.red('ERROR:'), error);

  process.exit();
}
