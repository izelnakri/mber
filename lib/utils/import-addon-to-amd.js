import fs from 'fs';
import { promisify } from 'util';
import RSVP from 'rsvp';
import convertESModuletoAMD from './convert-es-module-to-amd';
import searchInParentDirectories from './search-in-parent-directories';
import lookup from './recursive-file-lookup';

const readFileAsync = promisify(fs.readFile);

export default function(moduleName, addonPath) {
  const CWD = process.cwd();
  const projectRoot = searchInParentDirectories(CWD, 'package.json');

  return new Promise((resolve) => {
    lookup(`${projectRoot}/node_modules/${addonPath}`, { depthLimit: -1 }).then((files) => {
      return RSVP.hash(files.reduce((result, fileName) => {
        return Object.assign(result, { [fileName]: readFileAsync(fileName) });
      }, {}));
    }).then((contents) => {
      const transformedFiles = Object.keys(contents)
        .map((filePath) => convertFile(contents[filePath], moduleName, filePath, addonPath));

      return resolve(transformedFiles.join('\n'));
    });
  });
}

// TODO: can we turn moduleEntryPoint to node_modules/etc?
function convertFile(code, libraryName, fileAbsolutePath, moduleEntryPoint='ember-data/addon') {
  const startIndex = fileAbsolutePath.indexOf(moduleEntryPoint);
  const moduleName = fileAbsolutePath.slice(startIndex + moduleEntryPoint.length);
  const finalModuleName = `${libraryName}${moduleName.slice(0, -3)}`;
  const libraryPath = fileAbsolutePath.slice(0, fileAbsolutePath.lastIndexOf(moduleEntryPoint) + moduleEntryPoint.length);

  return convertESModuletoAMD(code, {
    moduleName: finalModuleName,
    libraryPath: libraryPath,
    fileAbsolutePath: fileAbsolutePath
  });
}

















// import { transform } from 'babel-core';
// import HTMLBarsCompiler from '../../../vendor/ember-template-compiler';
//
// export default function(hbsContent) {
//   const { code } = transform(hbsContent, {
//     plugins: [
//       ['babel-plugin-htmlbars-inline-precompile', { precompile: HTMLBarsCompiler.precompile }],
//
//     ]
//   });
//
//   return code;
// }
//
//
// import { transform } from 'babel-core';
// import HTMLBarsCompiler from './vendor/ember-template-compiler';
// import HTMLBarsInlinePrecompile from 'babel-plugin-htmlbars-inline-precompile';
//
// function compileHbs(hbsContent) {
//   const { code } = transform(hbsContent, {
//     plugins: [
//       [HTMLBarsInlinePrecompile, { precompile: HTMLBarsCompiler.precompile }],
//     ]
//   });
//   // TODO: put under requirejs with templates/
//   return code;
// }
//
// var content = fs.readFileSync('./ember-app-boilerplate/src/ui/routes/not-found/template.hbs');
//
//
// HTMLBarsCompiler.precompile(content.toString()) // works
