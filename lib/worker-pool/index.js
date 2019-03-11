const os = require('os');
const { Worker } = require('worker_threads');

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

    return new Promise((resolve) => { // TODO: implement reject
      this.waitUntilWorkerFrees((targetWorker) => {
        targetWorker.postMessage(data);
        targetWorker.on('message', (result) => {
          this.queue.pop(); // NOTE: this is buggy

          this.freeWorkers.push(targetWorker);

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

    console.log('waiting');
    await new Promise(done => setTimeout(done, 100));

    return await this.waitUntilWorkerFrees(callback);
  }
}
