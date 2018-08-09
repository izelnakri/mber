// NOTE: very messy decouple it
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
  cliArguments: {},
  ENV: {},
  indexHTMLInjections: {},
  projectRoot: null,
  testing: false
}) {
  return new Promise(async (resolve) => {
    let spinner = Console.spinner(`${chalk.yellow('BUNDLING')}: ${buildConfig.applicationName}...`);

    const CLI_ARGUMENTS = buildConfig.cliArguments || {};
    const PROJECT_ROOT = buildConfig.projectRoot || await findProjectRoot();
    const ENTRYPOINT = buildConfig.entrypoint || `${PROJECT_ROOT}/index.html`; // NOTE: if global.MBER_TEST_RUNNER take the first one otherwise take none? or when there is tests build tests.html
    const ENV = buildConfig.ENV || {};
    const OUTPUT_DIRECTORY = `${PROJECT_ROOT}/dist`;
    const timer = countTime();

    return Promise.all([
      fs.readFile(ENTRYPOINT),
      resetDistFolder(OUTPUT_DIRECTORY)
    ]).then(([htmlBuffer]) => {
      const transpiledHTMLBuffer = transpileIndexHTML(htmlBuffer.toString(), ENV, buildConfig);
      const htmlContent = transpiledHTMLBuffer.toString();
      const htmlAssets = findInternalAssetsFromHTML(htmlContent) // NOTE: assumes assets exist in /tmp directory
        .map((fileReferencePath) => fileReferencePath.replace('/assets', `${PROJECT_ROOT}/tmp/assets`));

      Promise.all(htmlAssets.map((filePath) => fs.readFile(filePath))).then((fileContents) => {
        const assetMap = fileContents.reduce((result, fileContent, index) => {
          return Object.assign(result, { [htmlAssets[index]]: fileContent });
        }, {});

        return Promise.all([
          hashAssets(PROJECT_ROOT, assetMap),
          fs.copy(`${PROJECT_ROOT}/public`, OUTPUT_DIRECTORY)
        ]);
      }).then(([[assetMap, hashedAssetMap]]) => {
        return Promise.all([
          writeAssetMap(PROJECT_ROOT, hashedAssetMap),
          CLI_ARGUMENTS.fastboot ? buildFastbootPackageJSON(hashedAssetMap, buildConfig, 'dist') : null,
          rewriteHTML(htmlContent, hashedAssetMap, `${OUTPUT_DIRECTORY}/index.html`)
        ].concat(htmlAssets.map((asset) => {
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

function findInternalAssetsFromHTML(htmlContent) {
  const $ = cheerio.load(htmlContent);
  const internalJSFiles = $('script[src]').toArray()
    .map((scriptNode) => $(scriptNode).attr('src'))
    .filter((uri) => !ABSOLUTE_URL_REGEX.test(uri));
  const internalCSSFiles = $('link[href]').toArray()
    .map((scriptNode) => $(scriptNode).attr('href'))
    .filter((uri) => !ABSOLUTE_URL_REGEX.test(uri));

  return internalCSSFiles.concat(internalJSFiles);
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

// NOTE: saferewrite only rewrites in css and html and jssourcemaps
// NOTE: assetMaps prepend and public references added for CDN rewrites
// NOTE: question: why do we fingerprint shit that is in public? why ember does this?
// NOTE: saferewrite(for sourcemaps):

// var re = new RegExp('["\'(=]\\s*([^"\'()=]*' + escapeRegExp(assetPath) + '[^"\'()\\>=]*)(\\?[^"\')> ]*)?\\s*\\\\*\\s*["\')> ]', 'g');
// while (match = re.exec(newString)) {
//   var replaceString = '';
//   if (ignoreLibraryCode.exec(match[1])) {
//     continue;
//   }
//
//   replaceString = match[1].replace(assetPath, replacementPath);
//
//   if (this.prepend && replaceString.indexOf(this.prepend) !== 0) {
//     var removeLeadingRelativeOrSlashRegex = new RegExp('^(\\.*/)*(.*)$');
//     replaceString = this.prepend + removeLeadingRelativeOrSlashRegex.exec(replaceString)[2];
//   }
//
//   newString = newString.replace(new RegExp(escapeRegExp(match[1]), 'g'), replaceString);
// }
//
// var self = this;
// return newString.replace(new RegExp('sourceMappingURL=' + escapeRegExp(assetPath)), function(wholeMatch) {
//   var replaceString = replacementPath;
//   if (self.prepend && (!/^sourceMappingURL=(http|https|\/\/)/.test(wholeMatch))) {
//     replaceString = self.prepend + replacementPath;
//   }
//   return wholeMatch.replace(assetPath, replaceString);
// });

/*
 * /([.*+?^=!:${}()|\[\]\/\\])/g - Replace .*+?^=!:${}()|[]/\ in filenames with an escaped version for an exact name match
 */
// function escapeRegExp(string) {
//   return string.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
// }
