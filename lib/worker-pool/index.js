const os = require('os');
const { Worker } = require('worker_threads');
const chalk = require('ansi-colors');
const Console = require('../utils/console');

export default {
  threadCount: 0,
  workers: [],
  freeWorkers: [],
  start(workerAmount) {
    this.threadCount = workerAmount || os.cpus().length;
    this.workers = Array.from({ length: this.threadCount }).map(() => new Worker(`${__dirname}/worker.js`));
    this.workers.forEach((worker) => this.freeWorkers.push(worker));

    return this;
  },
  submit(data) {
    return new Promise((resolve, reject) => {
      this.waitUntilWorkerFrees((targetWorker) => {
        targetWorker.once('error', (error) => {
          Console.log(`${chalk.blue('[WORKER]')} error`, error);

          reject(error);
        });
        targetWorker.once('exit', (code) => {
          Console.log(`${chalk.blue('[WORKER]')} exited with code`, code);

          resolve({ error: `[WORKER] exited with code: ${code}` });
        });
        targetWorker.once('message', (result) => {
          console.log('MESSAGES CALLED!!');

          this.freeWorkers.push(targetWorker);

          if (result && result.error) {
            return reject(result);
          }

          resolve(result);
        });

        targetWorker.postMessage(data);
      });
    });
  },
  waitUntilWorkerFrees: async function(callback) {
    if (this.freeWorkers.length > 0) {
      const targetWorker = this.freeWorkers.pop();

      return callback(targetWorker);
    }

    console.log('TASK WAITING FOR WORKER');

    await new Promise((done) => setTimeout(done, 100));


    return await this.waitUntilWorkerFrees(callback);
  }
}
