const os = require('os');
const { Worker } = require('worker_threads');
const chalk = require('ansi-colors');
const Console = require('../utils/console');

// TODO: ON ERROR ALSO FREE THE WORKER!!
export default {
  threadCount: 0,
  queue: [],
  workers: [],
  freeWorkers: [],
  start(workerAmount) {
    const threadCount = workerAmount || os.cpu().length;

    this.threadCount = threadCount;
    this.workers = Array.from({ length: threadCount }).map(() => new Worker(`${__dirname}/worker.js`));
    this.workers.forEach((worker) => this.freeWorkers.push(worker));

    return this;
  },
  submit(data) {
    this.queue.push(data);

    return new Promise((resolve, reject) => {
      this.waitUntilWorkerFrees((targetWorker) => {
        targetWorker.postMessage(data);

        targetWorker.on('error', (error) => {
          Console.log(`${chalk.blue('[WORKER]')} error`, error);
          reject(error);
        });
        targetWorker.on('exit', (code) => {
          Console.log(`${chalk.blue('[WORKER]')} exited with code`, code);
          reject(code);
        });

        targetWorker.on('message', (result) => {
          this.queue.pop(); // NOTE: this might be buggy

          this.freeWorkers.push(targetWorker);

          if (result && result.error) {
            reject(result);
          }

          resolve(result);
        });
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
