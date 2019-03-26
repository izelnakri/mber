const os = require('os');
const { Worker } = require('worker_threads');
const chalk = require('ansi-colors');
const Console = require('../utils/console');

export default {
  threadCount: 0,
  queue: [], // type is { worker, callback, resolve, reject }
  workers: [],
  freeWorkers: [],
  start(workerAmount) {
    this.freeWorkers = [];
    this.threadCount = workerAmount || os.cpus().length;
    this.workers = Array.from({ length: this.threadCount }).map(() => new Worker(`${__dirname}/worker.js`));

    this.workers.forEach((worker) => {
      this.freeWorkers.push(worker);

      worker.on('error', (error) => {
        Console.log(`${chalk.blue('[WORKER]')} error`, error);

        const workInQueue = this.queue.findIndex((queueElement) => queueElement.threadId === worker.threadId);

        if (workInQueue) {
          workInQueue.reject(error);
        }
      });
      worker.on('exit', (code) => {
        if (Object.keys(process.argv).find((key) => key === 'DEBUG')) {
          Console.log(`${chalk.blue('[WORKER]')} exit with code`, code);
        }
      });
      worker.on('message', (result) => {
        const targetQueueElementIndex = this.queue.findIndex((queueElement) => queueElement.threadId === worker.threadId);
        const targetQueueElement = this.queue.splice(targetQueueElementIndex, 1)[0];
        const pendingQueueElement = this.queue.find((queueElement) => queueElement.threadId === null);

        if (pendingQueueElement) {
          pendingQueueElement.threadId = worker.threadId;
          pendingQueueElement.callback(worker);
        } else {
          this.freeWorkers.push(worker);
        }

        if (result && result.error) {
          return targetQueueElement.reject(result);
        }

        targetQueueElement.resolve(result);
      });
    });

    return this;
  },
  submit(data) {
    return new Promise((resolve, reject) => {
      this.waitUntilWorkerFrees(resolve, reject, (targetWorker) => {
        targetWorker.postMessage(data);
      });
    });
  },
  waitUntilWorkerFrees(resolve, reject, callback) {
    const targetWorker = this.freeWorkers.pop();

    if (targetWorker) {
      this.queue.push({ callback, threadId: targetWorker.threadId, resolve, reject });

      return callback(targetWorker);
    }

    this.queue.push({ callback, threadId: null, resolve, reject });
  }
}
