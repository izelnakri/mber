import { exec } from 'child_process';
import { promisify } from 'util';

const shell = promisify(exec);

export default async function(port) {
  try {
    await shell(`kill -9 $(lsof -i tcp:${port} | grep LISTEN | awk '{print $2}')`);
  } catch(error) {
  }

}
