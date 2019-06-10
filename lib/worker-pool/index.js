import os from 'os';
import { Worker } from 'worker_threads';
import chalk from 'ansi-colors';
import Console from '../utils/console.js';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  threadCount: 0,
  queue: [], // type is { worker, callback, resolve, reject }
  workers: [],
  freeWorkers: [],
  start(workerAmount) {
    this.freeWorkers = [];
    this.threadCount = workerAmount || os.cpus().length;
    this.workers = Array.from({ length: this.threadCount })
      .map(() => new Worker(`${__dirname}/worker.js`, { execArgv: ['--experimental-modules'] }));

    this.workers.forEach((worker) => {
      this.freeWorkers.push(worker);

      worker.on('error', (error) => {
        Console.log(`${chalk.blue('[WORKER]')} error`, error);

        const workInQueue = this.queue.find((queueElement) => queueElement.threadId === worker.threadId);

        if (workInQueue) {
          workInQueue.reject(error);
        }
      });
      worker.on('exit', (code) => {
        if (Object.keys(process.argv).find((key) => key === 'DEBUG')) {
          Console.log(`${chalk.blue('[WORKER]')} exit with code`, code);
        }

        const workInQueue = this.queue.find((queueElement) => queueElement.threadId === worker.threadId);

        if (workInQueue) {
          workInQueue.reject();
        }
      });
      worker.on('message', (result) => {
        const { targetQueueElementIndex, pendingQueueElement } = this.queue.reduce((result, queueElement, index) => {
          if (queueElement.threadId === worker.threadId) {
           return Object.assign(result, { targetQueueElementIndex: index });
          } else if (queueElement.threadId === null) {
           return Object.assign(result, { pendingQueueElement: queueElement });
          }

          return result;
        }, { pendingQueueElement: null });
        const targetQueueElement = this.queue.splice(targetQueueElementIndex, 1)[0];

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
      this.pushToQueueUntilWorkerFrees(resolve, reject, (targetWorker) => {
        targetWorker.postMessage(data);
      });
    });
  },
  pushToQueueUntilWorkerFrees(resolve, reject, callback) {
    const targetWorker = this.freeWorkers.pop();

    if (targetWorker) {
      this.queue.push({ callback, threadId: targetWorker.threadId, resolve, reject });

      return callback(targetWorker);
    }

    this.queue.push({ callback, threadId: null, resolve, reject });
  }
}
