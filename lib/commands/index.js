import chalk from 'ansi-colors';

const highlight = (text) => chalk.red.bold(text);

// prettier-ignore
export default async function() {
  const config = await import('../../package.json');

  console.log(`${highlight("[mber CLI v" + config.version + "] Usage:")} mber ${chalk.yellow('<command (Default: help)>')}
mber init | new                    # Sets up the initial ember folder structure
mber serve | server                # Starts your ember development server ${chalk.green('[alias: "mber s"]')}
mber build | b                     # Builds your ember application and outputs to /dist folder
mber console | c                   # Boots your ember application with DOM in a node.js repl
mber test | t                      # Runs your ember tests ${chalk.green('(--server to run them in browser)')}
mber generate | g [type] [name]    # Generate ember files for certain abstraction type
mber delete | d [type] [name]      # Remove ember files for certain abstraction type
`);
}
