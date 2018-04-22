import chalk from 'chalk';

const config = require('../../package.json');

// prettier-ignore
export default function() {
  console.log(`${chalk.cyan('[mber CLI] Usage:')} mber ${chalk.yellow('<command (Default: help)>')}
Version: ${config.version}
mber init | new                    # Sets up the initial ember folder structure
mber serve | server                # Starts your ember development server ${chalk.cyan('[alias: "mber s"]')}
mber version | v                   # Displays mber CLI version
`);
}

// ember generate model ${chalk.yellow('[ModelName]')}    # Generates the initial files for a ember Model ${chalk.cyan('[alias: "ember g model"]')}
// ember generate fixtures             # Outputs your initial ember state as pure javascript fixture files
// ember generate fixtures ${chalk.yellow('[ModelName]')} # Outputs your initial ember state for certain model as pure javascript fixture
// ember console                       # Starts a ember console in node.js ${chalk.cyan('[alias: "ember c"]')}
// ember build | rollup ${chalk.yellow('[outputFile]')}   # Builds an ES5 javascript bundle with all your ember code
// ember version | v                   # Displays ember version
