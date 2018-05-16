import fs from 'fs';
import { promisify } from 'util';
import RSVP from 'rsvp';
import convertESModuletoAMD from './convert-es-module-to-amd';
import findProjectRoot from './find-project-root';
import lookup from './recursive-file-lookup';

const readFileAsync = promisify(fs.readFile);

// TODO: can we turn moduleEntryPoint to node_modules/etc? different one for in-app javascript?
export default function(moduleName, addonPath) {
  const projectRoot = findProjectRoot();
  const mberPackage = `${__dirname}/../../node_modules/${addonPath}`;
  const packagePath = fs.existsSync(mberPackage) ? mberPackage : `${projectRoot}/node_modules/${addonPath}`;

  return new Promise((resolve) => {
    lookup(packagePath, 'js').then((files) => {
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

function convertFile(code, libraryName, fileAbsolutePath, moduleEntryPoint='ember-data/addon') {
  const startIndex = fileAbsolutePath.indexOf(moduleEntryPoint);
  const moduleName = fileAbsolutePath.slice(startIndex + moduleEntryPoint.length);
  const finalModuleName = `${libraryName}${moduleName.slice(0, -3)}`;

  return convertESModuletoAMD(code, { moduleName: finalModuleName });
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
