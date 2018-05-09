import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';

const shell = promisify(exec);
const CWD = process.cwd();

export default async function(appName='testapp') {
  return new Promise(async (resolve) => {
    await shell(`node ${CWD}/cli.js new ${appName}`);
    fs.symlinkSync(`${__dirname}/../../node_modules`, `${CWD}/testapp/node_modules`); // TODO: this is huge
    resolve();
  });
}
