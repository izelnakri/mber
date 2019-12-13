import fs from 'fs-extra';
import chalk from 'ansi-colors';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const highlight = (text) => chalk.red.bold(text);

// prettier-ignore
export default async function() {
  const config = JSON.parse((await fs.readFile(`${__dirname}/../../package.json`)));

  console.log(`${highlight("[mber CLI v" + config.version + "] Usage:")} mber ${chalk.yellow('<command (Default: help)>')}
mber init | new                     # Sets up the initial ember folder structure
mber serve | server                 # Starts your ember development server ${chalk.green('[alias: "mber s"]')}
mber build | b                      # Builds your ember application and outputs to /dist folder
mber test | t                       # Runs your ember tests ${chalk.green('(--server to run them in browser)')}
mber compile | transpile [path]     # Compiles/transpiles your provided file or folder path ${chalk.green('[alias: "mber c"]')}
mber console                        # Boots your ember application with DOM in a node.js repl
mber generate | g [type] [name]     # Generate ember files for certain abstraction type
mber delete | d [type] [name]       # Remove ember files for certain abstraction type
`);
}
