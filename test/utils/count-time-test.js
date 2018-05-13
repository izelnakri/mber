import test from 'ava';
import countTime from '../../lib/utils/count-time';

test.cb('countTime() works', (t) => {
  const currentTime = +(new Date());
  const timer = countTime();

  t.plan(4);
  t.true(0 > currentTime < timer.startTime < (currentTime + 1000));

  setTimeout(() => {
    const endTimeInUnix = timer.stop();
    const endTime = +(new Date());

    t.true(endTimeInUnix > 0);
    t.true(currentTime < timer.startTime < endTimeInUnix < endTime);
    t.true(currentTime + 3000 < endTimeInUnix < currentTime + 3200);

    t.end();
  }, 3000);
});
