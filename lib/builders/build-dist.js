import crypto from 'crypto';
import { promisify } from 'util';
import cheerio from 'cheerio';
import chalk from 'chalk';
import fs from 'fs-extra';
import rimraf from 'rimraf';
import Console from '../utils/console';
import findProjectRoot from '../utils/find-project-root';

const copyAsync = promisify(fs.copy);
const mkdirAsync = promisify(fs.mkdir);
const readFileAsync = promisify(fs.readFile);
const rmdirAsync = promisify(rimraf);
const writeFileAsync = promisify(fs.writeFile);

const ABSOLUTE_URL_REGEX = new RegExp('^(?:[a-z]+:)?//', 'i');
const PROJECT_ROOT = findProjectRoot();
const PUBLIC_DIRECTORY = `${PROJECT_ROOT}/public`;
const OUTPUT_DIRECTORY = `${PROJECT_ROOT}/dist`;

export default function(entryPoint, options={}) {
  return new Promise((resolve) => {
    return Promise.all([
      readFileAsync(entryPoint),
      resetDistFolder()
    ]).then(([htmlBuffer]) => {
      const htmlContent = htmlBuffer.toString();
      const htmlAssets = findInternalAssetsFromHTML(htmlContent)
        .map((fileReferencePath) => fileReferencePath.replace('/assets', `${PROJECT_ROOT}/tmp`));

      Promise.all(htmlAssets.map((filePath) => readFileAsync(filePath))).then((fileContents) => {
        const assetMap = fileContents.reduce((result, fileContent, index) => {
          return Object.assign(result, { [htmlAssets[index]]: fileContent });
        }, {});

        return Promise.all([
          hashAssets(assetMap),
          copyAsync(PUBLIC_DIRECTORY, OUTPUT_DIRECTORY),
        ]);
      }).then(([[assetMap, hashedAssetMap]]) => {
        return Promise.all([
          writeAssetMap(hashedAssetMap),
          rewriteHTML(entryPoint, htmlContent, hashedAssetMap)
        ].concat(htmlAssets.map((asset) => safeRewrite(asset, assetMap[asset], hashedAssetMap))));
      }).then(() => resolve())
        .catch(errorReporter);
    }).catch(errorReporter);
  });
}

function resetDistFolder() {
  return new Promise((resolve, reject) => {
    rmdirAsync(OUTPUT_DIRECTORY).then(() => mkdirAsync(OUTPUT_DIRECTORY))
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

function hashAssets(assetMap) {
  return new Promise((resolve) => {
    resolve([
      assetMap, Object.keys(assetMap).reduce((result, assetName) => {
        const fileName = assetName.replace(`${PROJECT_ROOT}/tmp`, 'assets');
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

function safeRewrite(fileName, fileContent, assetMap) {
  const referenceName = fileName.replace(`${PROJECT_ROOT}/`, '') // NOTE: in future we can do safe rewrite here
    .replace('tmp/', 'assets/');

  return writeFileAsync(`${OUTPUT_DIRECTORY}/${assetMap[referenceName]}`, fileContent);
}

function writeAssetMap(assetMap) {
  return writeFileAsync(`${PROJECT_ROOT}/dist/assets/assetMap.json`, JSON.stringify({
    assets: Object.assign(assetMap, { 'assets/assetMap.json': 'assets/assetMap.json' }),
    prepend: ''
  }, null, 2));
}

function rewriteHTML(entrypoint, htmlContent, hashedAssetMap) {
  const content = Object.keys(hashedAssetMap).reduce((result, baseAssetName) => {
    return result.replace(baseAssetName, hashedAssetMap[baseAssetName]);
  }, htmlContent);

  return writeFileAsync(`${PROJECT_ROOT}/dist/index.html`, content);
}

function errorReporter(error) {
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
