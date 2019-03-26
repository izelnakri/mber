import crypto from 'crypto';
import chalk from 'ansi-colors';
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
    const cliArguments = buildConfig.cliArguments || {
      fastboot: true, port: 1234, socketPort: 1234, testing: true
    };
    const projectRoot = buildConfig.projectRoot || await findProjectRoot();
    const ENV = buildConfig.ENV || { environment: 'development', modulePrefix: 'frontend' };
    const outputDirectory = `${projectRoot}/dist`;
    const timer = countTime();
    const shouldBuildTests = (ENV.environment !== 'production') && cliArguments.testing;
    const shouldBuildDocumentation = ENV.documentation && ENV.documentation.enabled;

    return Promise.all([
      fs.readFile(`${projectRoot}/index.html`),
      shouldBuildTests ? fs.readFile(`${projectRoot}/tests/index.html`) : null,
      shouldBuildDocumentation ?
        fs.readFile(`${projectRoot}/tmp/${ENV.documentation.path}.html`) : null,
      resetDistFolder(outputDirectory)
    ]).then(([indexHTMLBuffer, testHTMLBuffer, documentationHTMLBuffer]) => {
      const transpiledHTMLBuffer = transpileIndexHTML(indexHTMLBuffer.toString(), ENV, buildConfig.indexHTMLInjections);
      const transpiledTestHTMLBuffer = testHTMLBuffer && transpileIndexHTML(testHTMLBuffer.toString(), ENV, buildConfig.indexHTMLInjections);
      const indexHTMLContent = transpiledHTMLBuffer.toString();
      const documentationHTMLContent = shouldBuildDocumentation ?
        documentationHTMLBuffer.toString() : null;
      const initialAssets = shouldBuildDocumentation ?
        findInternalAssetsFromHTML(projectRoot, documentationHTMLContent) :
        findInternalAssetsFromHTML(projectRoot, indexHTMLContent);
      const testsHTMLContent = testHTMLBuffer && transpiledTestHTMLBuffer.toString();
      const testAssets = shouldBuildTests && findInternalAssetsFromHTML(projectRoot, testsHTMLContent); // NOTE: assumes assets exist in /tmp directory
      const targetAssets = (shouldBuildTests ? initialAssets.concat(testAssets) : initialAssets)
        .filter((element, index, array) => index === array.indexOf(element));

      Promise.all(targetAssets.map((filePath) => fs.readFile(filePath))).then((fileContents) => {
        const assetMap = fileContents.reduce((result, fileContent, index) => {
          return Object.assign(result, { [targetAssets[index]]: fileContent });
        }, {});

        return Promise.all([
          hashAssets(projectRoot, assetMap),
          fs.copy(`${projectRoot}/public`, outputDirectory)
        ]);
      }).then(([[assetMap, hashedAssetMap]]) => {
        return Promise.all([
          writeAssetMap(projectRoot, hashedAssetMap),
          cliArguments.fastboot ? buildFastbootPackageJSON(hashedAssetMap, buildConfig, 'dist') : null,
          rewriteHTML(indexHTMLContent, hashedAssetMap, `${outputDirectory}/index.html`),
          shouldBuildDocumentation ?
            rewriteHTML(
              documentationHTMLContent,
              hashedAssetMap,
              `${outputDirectory}/${ENV.documentation.path}.html`
            ) : '',
          testsHTMLContent ?
            rewriteHTML(testsHTMLContent, hashedAssetMap, `${outputDirectory}/tests.html`) : null
        ].concat(targetAssets.map((asset) => {
          return safeRewrite({
            fileName: asset,
            fileContent: assetMap[asset],
            projectRoot: projectRoot,
            outputDirectory: outputDirectory
          }, hashedAssetMap);
        })));
      }).then(async () => {
        spinner.stop();

        const TIME_SPENT = `${timer.stop()}ms`;

        Console.log(`${chalk.green('BUNDLED')}: ${buildConfig.applicationName} in ${chalk.yellow(TIME_SPENT)}`);

        const targetDirectory = outputDirectory.slice(projectRoot.length + 1);

        console.log(chalk.green(`Built project successfully. Stored in "./${targetDirectory}":`));

        const dist = await fs.readdir(`${outputDirectory}/assets`);
        const result = await Promise.all(
          dist.filter((file) => file.endsWith('.js') || file.endsWith('.css'))
            .map((fileName) => reportFile(`${outputDirectory}/assets/${fileName}`))
        );

        resolve(result);
      }).catch(reportErrorAndExit);
    }).catch(reportErrorAndExit);
  });
}

function resetDistFolder(outputDirectory) {
  return new Promise((resolve, reject) => {
    fs.remove(outputDirectory)
      .then(() => fs.mkdir(outputDirectory))
      .then(() => fs.mkdir(`${outputDirectory}/assets`))
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

function hashAssets(projectRoot, assetMap) {
  return new Promise((resolve) => {
    resolve([
      assetMap, Object.keys(assetMap).reduce((result, assetName) => {
        const fileName = assetName.replace(`${projectRoot}/tmp/`, '');
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

function writeAssetMap(projectRoot, hashedAssetMap) {
  return fs.writeFile(`${projectRoot}/dist/assets/assetMap.json`, JSON.stringify({
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

  setTimeout(() => process.exit(1), 100);
}
