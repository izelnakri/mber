import klaw from 'klaw';
import through2 from 'through2';

export default function(directory, extensions, options={}) {
  return new Promise((resolve) => {
    const items = []; // NOTE: files, directories, symlinks, etc

    klaw(directory, Object.assign({ depthLimit: options.depthLimit || -1 }, options))
      .pipe(through2.obj(function(item, enc, next) {
        if (!item.stats.isDirectory() && shouldIncludeItem(item, extensions)) {
          this.push(item);
        }

        next();
      }))
      .on('data', (item) => items.push(item.path))
      .on('end', () => resolve(items));
  });
}

function shouldIncludeItem(item, extensions) {
  if (!extensions) {
    return item;
  } else if (Array.isArray(extensions) && extensions.some((ext) => item.path.endsWith(ext))) {
    return item;
  } else if (item.path.endsWith(extensions)) {
    return item;
  }
}
