import fs from 'fs-extra';

export default function(projectRoot, contentToInject, targetProcess) {
  const HBS_FILE = `${projectRoot}/src/ui/routes/index/template.hbs`;

  return new Promise(async (resolve, reject) => {
    let stdout = [];

    targetProcess.stdout.on('data', (data) => {
      stdout.push(data);
      if (data.includes('ember BUILT: application.js')) {
        const result = stdout.join('');

        console.log('stdout is');
        console.log(result);

        resolve({ stdoutAfterInjection: result });
      }
    });
    targetProcess.stderr.on('data', (data) => {
      console.log('TARGETPROCESS PROCESS STDERR ERROR:');
      console.log(data);
      reject(data);
    });

    const content = (await fs.readFile(HBS_FILE)).toString();
    const html = content + `\n${contentToInject}`;

    await fs.writeFile(HBS_FILE, html);

    setTimeout(() => {
      console.log('SPAWNED PROCESS RETURNS STDOUT FROM TIMEOUT...');

      const result = stdout.join('');

      console.log('stdout is');
      console.log(result);
      resolve({ stdoutAfterInjection: result });
    }, 10000);
  });
}



// return new Promise((resolve, reject) => {
//   let stdout = [];
//   let childProcess = child_process.exec(command, options);
//
//   childProcessTree.push(childProcess);
//   childProcess.stdout.on('data', (data) => {
//     stdout.push(data);
//
//     if (data.includes('Server is running on http://localhost:')) {
//       setTimeout(() => {
//         const result = stdout.join('');
//         console.log('stdout is');
//         console.log(result);
//         resolve({ stdout: result, childProcess });
//       }, 2000);
//     }
//   });
//   childProcess.stderr.on('data', (data) => {
//     console.log('SPAWNED PROCESS STDERR ERROR:');
//     console.log(data);
//     reject(data);
//   });
//
//   setTimeout(() => {
//     console.log('SPAWNED PROCESS RETURNS STDOUT FROM TIMEOUT...');
//     const result = stdout.join('');
//     console.log('stdout is');
//     console.log(result);
//     resolve({ stdout: result, childProcess });
//   }, 10000);
// });
