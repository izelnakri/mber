import say from 'say';
import { spawnSync } from 'child_process';

const IS_MAC_OS = process.platform === 'darwin';

export default {
  speak(text) {
    if (IS_MAC_OS || (spawnSync('festival').status === 0)) {
      return say.speak(text);
    }

    return console.log('\u0007');
  },
  stop() {
    if (IS_MAC_OS) {
      return say.stop();
    }
  }
}
