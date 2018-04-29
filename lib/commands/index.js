import chalk from 'chalk';

const config = require('../../package.json');

// prettier-ignore
export default function() {
  console.log(`${chalk.cyan('[mber CLI v' + config.version + '] Usage:')} mber ${chalk.yellow('<command (Default: help)>')}
mber init | new                    # Sets up the initial ember folder structure
mber serve | server                # Starts your ember development server ${chalk.cyan('[alias: "mber s"]')}
mber build | b                     # Builds your ember application and outputs to /dist folder
mber console | c                   # Boots your ember application with DOM in a node.js repl
`);
}

// mber test | t                      # Runs your ember tests
// ember generate fixtures ${chalk.yellow('[ModelName]')} # Outputs your initial ember state for certain model as pure javascript fixture
