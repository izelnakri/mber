import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';

const shell = promisify(exec);
const CWD = process.cwd();

// TODO: reset tmp and dist folders
export default async function(appName = 'dummyapp') {
  await shell(`node --experimental-modules ${CWD}/cli.js new ${appName}`);

  const TARGET_PROJECT_PATH = `${CWD}/${appName}`;

  if (!(await fs.exists(`${TARGET_PROJECT_PATH}/node_modules`))) {
    // await fs.mkdirp(TARGET_PROJECT_PATH);
    await fs.symlink(`${__dirname}/../../node_modules`, `${TARGET_PROJECT_PATH}/node_modules`); // TODO: this is huge
  }

  const contents = (await fs.readFile(`${TARGET_PROJECT_PATH}/index.js`)).toString();

  await fs.writeFile(
    `${TARGET_PROJECT_PATH}/index.js`,
    contents.replace("import app from 'mber';", "import app from '../index.js';")
  );
  await Promise.all([
    fs.remove(`${TARGET_PROJECT_PATH}/dist`),
    fs.remove(`${TARGET_PROJECT_PATH}/tmp`)
  ]);
  await Promise.all([
    fs.mkdirp(`${TARGET_PROJECT_PATH}/dist`),
    fs.mkdirp(`${TARGET_PROJECT_PATH}/tmp`)
  ]);
}
