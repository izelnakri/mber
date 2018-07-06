// NOTE: very messy decouple it
import crypto from 'crypto';
import { promisify } from 'util';
import chalk from 'chalk';
import cheerio from 'cheerio';
import fs from 'fs-extra';
import rimraf from 'rimraf';
import buildFastbootPackageJSON from './build-fastboot-package-json';
import transpileIndexHTML from '../transpilers/transpile-index-html';
import Console from '../utils/console';
import countTime from '../utils/count-time';
import findProjectRoot from '../utils/find-project-root';
import { reportFile } from '../utils/asset-reporter';

const copyAsync = promisify(fs.copy);
const mkdirAsync = promisify(fs.mkdir);
const readFileAsync = promisify(fs.readFile);
const readdirAsync = promisify(fs.readdir);
const rmdirAsync = promisify(rimraf);
const writeFileAsync = promisify(fs.writeFile);

const ABSOLUTE_URL_REGEX = new RegExp('^(?:[a-z]+:)?//', 'i');

export default function(entryPoint, buildConfig={}, options={ fastboot: true }) {
  const PROJECT_ROOT = findProjectRoot();
  const OUTPUT_DIRECTORY = `${PROJECT_ROOT}/dist`;

  const { ENV } = buildConfig;
  let spinner = Console.spinner(`${chalk.yellow('BUNDLING')}: ${buildConfig.applicationName}...`);

  const timer = countTime();

  return new Promise((resolve) => {
    return Promise.all([
      readFileAsync(entryPoint),
      resetDistFolder(OUTPUT_DIRECTORY)
    ]).then(([htmlBuffer]) => {
      const transpiledHTMLBuffer = transpileIndexHTML(htmlBuffer.toString(), ENV, buildConfig);
      const htmlContent = transpiledHTMLBuffer.toString();
      const htmlAssets = findInternalAssetsFromHTML(htmlContent) // NOTE: assumes assets exist in /tmp directory
        .map((fileReferencePath) => fileReferencePath.replace('/assets', `${PROJECT_ROOT}/tmp/assets`));

      Promise.all(htmlAssets.map((filePath) => readFileAsync(filePath))).then((fileContents) => {
        const assetMap = fileContents.reduce((result, fileContent, index) => {
          return Object.assign(result, { [htmlAssets[index]]: fileContent });
        }, {});

        return Promise.all([
          hashAssets(PROJECT_ROOT, assetMap),
          copyAsync(`${PROJECT_ROOT}/public`, OUTPUT_DIRECTORY)
        ]);
      }).then(([[assetMap, hashedAssetMap]]) => {
        return Promise.all([
          writeAssetMap(PROJECT_ROOT, hashedAssetMap),
          options.fastboot ? buildFastbootPackageJSON(hashedAssetMap, ENV, 'dist') : null,
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

        await reportAssets(PROJECT_ROOT, OUTPUT_DIRECTORY);

        resolve();
      }).catch(reportErrorAndExit);
    }).catch(reportErrorAndExit);
  });
}

function resetDistFolder(OUTPUT_DIRECTORY) {
  return new Promise((resolve, reject) => {
    rmdirAsync(OUTPUT_DIRECTORY)
      .then(() => mkdirAsync(OUTPUT_DIRECTORY))
      .then(() => mkdirAsync(`${OUTPUT_DIRECTORY}/assets`))
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

  return writeFileAsync(`${outputDirectory}/${assetMap[referenceName]}`, fileContent);
}

function writeAssetMap(PROJECT_ROOT, hashedAssetMap) {
  return writeFileAsync(`${PROJECT_ROOT}/dist/assets/assetMap.json`, JSON.stringify({
    assets: Object.assign(hashedAssetMap, { 'assets/assetMap.json': 'assets/assetMap.json' }),
    prepend: ''
  }, null, 2));
}

function rewriteHTML(htmlContent, hashedAssetMap, outputPath) {
  const content = Object.keys(hashedAssetMap).reduce((result, baseAssetName) => {
    return result.replace(baseAssetName, hashedAssetMap[baseAssetName]);
  }, htmlContent);

  return writeFileAsync(outputPath, content);
}

function reportErrorAndExit(error) {
  Console.log(chalk.red('ERROR:'), error);

  process.exit();
}

async function reportAssets(PROJECT_ROOT, OUTPUT_DIRECTORY) {
  return new Promise(async (resolve) => {
    const outputDirectory = OUTPUT_DIRECTORY.slice(PROJECT_ROOT.length + 1);

    console.log(chalk.green(`Built project successfully. Stored in "./${outputDirectory}":`));

    const dist = await readdirAsync(`${OUTPUT_DIRECTORY}/assets`);

    return Promise.all(
      dist.filter((file) => file.endsWith('.js') || file.endsWith('.css'))
        .map((fileName) => reportFile(`${OUTPUT_DIRECTORY}/assets/${fileName}`))
    ).then(() => resolve())
  });
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
