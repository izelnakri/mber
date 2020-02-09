import test from 'ava';
import assetReporter from '../../utils/asset-reporter';

const { formatTimePassed, formatSize } = assetReporter;

test('formatTimePassed(number) turns number into ${number}ms', (t) => {
  t.true(formatTimePassed(14230).includes('14230ms'));
  t.true(formatTimePassed(3000).includes('3000ms'));
  t.true(formatTimePassed(288).includes('288ms'));
  t.true(formatTimePassed(55).includes('55ms'));
  t.true(formatTimePassed(9).includes('9ms'));
  t.true(formatTimePassed(0).includes('0ms'));
});
test('formatSize(sizeInBytes) returns right value for files less than a megabyte', (t) => {
  t.true(formatSize(0) === '0.00 kB');
  t.true(formatSize(9) === '0.01 kB');
  t.true(formatSize(23) === '0.02 kB');
  t.true(formatSize(874) === '0.87 kB');
  t.true(formatSize(1049) === '1.05 kB');
  t.true(formatSize(1056) === '1.06 kB');
  t.true(formatSize(75551) === '75.55 kB');
  t.true(formatSize(75556) === '75.56 kB');
  t.true(formatSize(99999) === '100.00 kB');
  t.true(formatSize(109999) === '110.00 kB');
  t.true(formatSize(999994) === '999.99 kB');
  t.true(formatSize(999995) === '1.00 MB');
  t.true(formatSize(999999) === '1.00 MB');
});
test('formatSize(sizeInBytes) returns right value for files more than or equal to a megabyte', (t) => {
  t.true(formatSize(1000000) === '1.00 MB');
  t.true(formatSize(1009000) === '1.01 MB');
  t.true(formatSize(1656000) === '1.66 MB');
  t.true(formatSize(2654000) === '2.65 MB');
  t.true(formatSize(7611000) === '7.61 MB');
  t.true(formatSize(12656000) === '12.66 MB');
  t.true(formatSize(34656000) === '34.66 MB');
  t.true(formatSize(99990012) === '99.99 MB');
  t.true(formatSize(99999012) === '100.00 MB');
  t.true(formatSize(111999012) === '112.00 MB');
});
