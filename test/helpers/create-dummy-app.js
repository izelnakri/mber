import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';

const shell = promisify(exec);
const CWD = process.cwd();

export default async function(appName='dummyapp') {
  return new Promise(async (resolve) => {
    await shell(`node ${CWD}/cli.js new ${appName}`);

    if (!(await fs.exists(`${CWD}/${appName}/node_modules`))) {
      await fs.symlink(`${__dirname}/../../node_modules`, `${CWD}/${appName}/node_modules`); // TODO: this is huge
    }

    const contents = (await fs.readFile(`${CWD}/${appName}/index.js`)).toString();
    await fs.writeFile(
      `${CWD}/${appName}/index.js`,
      contents.replace("const app = require('mber');", "const app = require('../index.js');")
    );

    resolve();
  });
}
