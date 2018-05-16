import { transform } from 'babel-core';
import HTMLBarsCompiler from './vendor/ember-template-compiler';
import HTMLBarsInlinePrecompile from 'babel-plugin-htmlbars-inline-precompile';

export default function(hbsContent) {
  const { code } = transform(hbsContent, {
    plugins: [ // TODO: also add other babel transpilings
      [HTMLBarsInlinePrecompile, { precompile: HTMLBarsCompiler.precompile }],
    ]
  });
  // TODO: put under requirejs with templates/
  return code;
}

// TODO: instead do importAddonToAMD(code, {plugins: }) with addition

// var content = fs.readFileSync('./ember-app-boilerplate/src/ui/routes/not-found/template.hbs');
//
// HTMLBarsCompiler.precompile(content.toString()) // works
