import klaw from 'klaw';
import through2 from 'through2';

export default function(directory, options={ depthLimit: -1, fileType: '.js' }) {
  return new Promise((resolve) => { // TODO: error handling
    const items = []; // files, directories, symlinks, etc

    klaw(directory, Object.assign({ depthLimit: -1, fileType: '.js' }, options))
      .pipe(through2.obj(function(item, enc, next) {
        if (!item.stats.isDirectory()) {
          this.push(item)
        }

        next()
      }))
      .on('data', item => items.push(item.path))
      .on('end', () => resolve(items));
  });
}
