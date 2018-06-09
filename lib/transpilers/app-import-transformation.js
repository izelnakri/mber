import fs from 'fs';
import { promisify } from 'util';
import Console from '../utils/console';

const readAsync = promisify(fs.readFile);

export default function(importObject, projectRoot) {
  return new Promise((resolve) => {
    readAsync(`${projectRoot}/${importObject.path}`).then((content) => {
      if (!importObject.options.using || importObject.options.using.length) {
        return resolve(content);
      }

      return importObject.options.using.reduce((transformObject) => { // NOTE: I might need to do ordering here for fastbootShim + AMD at the same time clash
        if (transformObject.transformation === 'fastbootShim') {
          return addFastbootShim(content);
        } else if (transformObject.transformation === 'amd') {
          return addAMDShim(transformObject.name, transformObject.transformation);
        }

        const { transformation, path } = transformObject;

        Console.error(`Invalid transformation: ${transformation} for ${path}`);

        return content;
      }, content);
    });
  });
}

function addFastbootShim(content) {
  return `if (typeof FastBoot === 'undefined') {\n${content}\n}`;
}

function addAMDShim(name, content) {
  if (name) {
    return [
      '(function(define){\n',
      content,
      '\n})((function(){ function newDefine(){ var args = Array.prototype.slice.call(arguments); args.unshift("',
      name,
      '"); return define.apply(null, args); }; newDefine.amd = true; return newDefine; })());',
    ].join('');
  }

  Console.error("Your AMD transformation misses a name! Example: app.import('/vendor/awesomelib.js', [{ transformation: 'amd', name: 'awesome-lib' }])");

  return content;
}

// NOTE: maybe put cjs and es6
