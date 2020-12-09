import path from 'path';
import fs from 'fs/promises';

export async function recursiveCopy(sourcePath, targetPath) {
  try {
    await fs.access(sourcePath)

    let stats = await fs.stat(sourcePath);

    if (stats.isDirectory()) {
      try {
        await fs.access(targetPath);
      } catch {
        await fs.mkdir(targetPath);
      }

      let entries = await fs.readdir(sourcePath);

      return await Promise.all(
        entries.map((entry) => recursiveCopy(path.join(sourcePath, entry), path.join(targetPath, entry)))
      );
    } else {
      return await fs.copyFile(sourcePath, targetPath);
    }
  } catch(error) {
    console.log('Recursive copy error:');
    throw error;
  }
}
