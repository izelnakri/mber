// TODO: saferewrite only rewrites in css and html and jssourcemaps
import crypto from 'crypto';
import fs from 'fs-extra';
import { promisify } from 'util';
import cheerio from 'cheerio';
import rimraf from 'rimraf';
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

// NOTE: assetMaps prepend and public references added for CDN rewrites

export default function(entryPoint, options={}) {
  return new Promise((resolve) => {
    return Promise.all([
      readFileAsync(entryPoint),
      resetDistFolder()
    ]).then(([htmlContent]) => {
      const htmlAssets = findInternalAssetsFromHTML(htmlContent).map((fileReferencePath) => {
        return fileReferencePath; // TODO: also convert them to correct paths!
      });

      Promise.all(htmlAssets.map((filePath) => readFileAsync(filePath))).then((fileContents) => {
        const assetMap = fileContents.reduce((result, fileContent, index) => {
          return Object.assign(result, { [htmlAssets[index]]: fileContent });
        }, {});

        Promise.all([
          copyAsync(PUBLIC_DIRECTORY, OUTPUT_DIRECTORY),
          hashAssets(assetMap)
        ]).then((_, hashedAssetMap) => {
          Promise.all([
            writeAssetMap(hashedAssetMap),
            rewriteHTML(entryPoint, hashedAssetMap)
          ].concat(htmlAssets.map((asset) => safeRewrite(asset, assetMap[asset], hashedAssetMap))))
            .then(() => resolve(hashedAssetMap)); // NOTE: question: why do we fingerprint shit that is in public? why ember does this?
        });
      });
    })
  });
}

// /public -> /dist
// /dist/assets/*
// /dist/assets/assetMap.json

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
    resolve(Object.keys(assetMap).reduce((result, assetName) => {
      const hashedName = hashFile(assetName, assetMap[assetName]);

      return Object.assign(result, { [assetName]: hashedName }); // TODO: these should be under /assets/
    }, {}));
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

function safeRewrite(fileName, assetMap) {
  return new Promise((resolve) => {

  });
}

function writeAssetMap(assetMap) {
  // writeFileAsync(`${PROJECT_ROOT}/dist/assets/assetMap.json`, JSON.stringify(hashedAssetMap)), // TODO: make this look good with utils
}

function rewriteHTML(entrypoint, hashedAssetMap) {

}

// {
//   "assets": {
//     "assets/assetMap.json": "assets/assetMap.json",
//     "assets/frontend-fastboot.js": "assets/frontend-fastboot-a9df394b8ef6fc15439dde84c1df4ca0.js",
//     "assets/frontend.css": "assets/frontend-dac05f53765d5b679c8aefb4edfac8a1.css",
//     "assets/frontend.js": "assets/frontend-7e0c61e7eac6c711bb6e6796981a1087.js",
//     "assets/vendor.css": "assets/vendor-d41d8cd98f00b204e9800998ecf8427e.css",
//     "assets/vendor.js": "assets/vendor-7be93d2a5cbe6aad8550506fc331395d.js",
//     "user-icon.png": "user-icon-d72a122fe58ed185399902913ae76fb3.png"
//   },
//   "prepend": ""
// }



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
