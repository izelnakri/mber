import fs from 'fs/promises';
import Console from '../utils/console.js';

export default function(importObject, projectRoot) {
  return new Promise((resolve, reject) => {
    fs.readFile(`${projectRoot}/${importObject.path}`).then((content) => {
      if (!importObject.options.using || (importObject.options.using.length === 0)) {
        return resolve(content);
      }

      return importObject.options.using.reduce((result, transformObject) => {
        if (transformObject.transformation === 'fastbootShim') {
          return resolve(addFastbootShim(result));
        }

        const { transformation, path } = transformObject;

        Console.error(`Invalid transformation: ${transformation} for ${path}`);

        reject(`Invalid transformation: ${transformation} for ${path}`);

        return result;
      }, content);
    });
  });
}

function addFastbootShim(content) {
  return `if (typeof FastBoot === 'undefined') {\n${content}\n}`;
}
