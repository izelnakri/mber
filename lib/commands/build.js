import Bundler from 'parcel-bundler';
import buildVendor from '../utils/build-vendor';
// import buildApplication from '../utils/build-application';
import Console from '../utils/console';
import searchInParentDirectories from '../utils/search-in-parent-directories';

export default async function(options={ watch: false }) {
  let spinner = Console.spinner('building application...');

  const entrypoint = searchInParentDirectories(process.cwd(), 'index.html');

  buildVendor()
    // .then(() => buildApplication())
    .then(async function () {
      const bundler = new Bundler(entrypoint, { file: entrypoint, logLevel: 2 });
      
      spinner.stop();

      await bundler.bundle();

      if (!options.watch) {
        process.exit();
      }
    });
}
