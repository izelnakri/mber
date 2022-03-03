import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import pathExists from '../../lib/utils/path-exists.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const shell = promisify(exec);
const CWD = process.cwd();

// TODO: reset tmp and dist folders
export default async function(appName = 'dummyapp') {
  await shell(`node ${CWD}/cli.js new ${appName}`);

  const TARGET_PROJECT_PATH = `${CWD}/${appName}`;

  if (!(await pathExists(`${TARGET_PROJECT_PATH}/node_modules`))) {
    // await fs.mkdir(TARGET_PROJECT_PATH, { recursive: true });
    await fs.symlink(`${__dirname}/../../node_modules`, `${TARGET_PROJECT_PATH}/node_modules`); // TODO: this is huge
  }

  const contents = (await fs.readFile(`${TARGET_PROJECT_PATH}/index.js`)).toString();

  await fs.writeFile(
    `${TARGET_PROJECT_PATH}/index.js`,
    contents.replace("import app from 'mber';", "import app from '../index.js';")
  );
  await Promise.all([
    fs.rm(`${TARGET_PROJECT_PATH}/dist`, { recursive: true, force: true }),
    fs.rm(`${TARGET_PROJECT_PATH}/tmp`, { recursive: true, force: true })
  ]);
  await Promise.all([
    fs.mkdir(`${TARGET_PROJECT_PATH}/dist`, { recursive: true }),
    fs.mkdir(`${TARGET_PROJECT_PATH}/tmp`, { recursive: true })
  ]);
}
