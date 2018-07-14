import test from 'ava';

// test.before(async () => {
//   if (fs.existsSync('myapp')) {
//     await rimraf.sync('myapp');
//   }
//
//   await mkdir('myapp');
// });

test.serial('importAddonToAmd(moduleName) works', (t) => {
  t.true(true); // TODO: do this
});

// test.todo('importAddonToAmd(moduleName, addonPath) works for node_module addon folder');
// test.todo('importAddonToAmd(moduleName, addonPath) works for non-node_module folder');


// TODO: test behavior   const packagePath = fs.existsSync(mberPackage) ? mberPackage : `${projectRoot}/node_modules/${addonPath}`;
