import Console from 'console';
import eslintReporter from 'eslint/lib/formatters/codeframe';
import chalk from 'chalk';

export default function(fileName, code, buildConfig) {
  // TODO: format fileName to strip stuff
  const codeString = code.toString();
  const report = buildConfig.jsLinter.executeOnText(codeString, fileName);

  // console.log('report is');
  // console.log(report);
  if (report.results[0].messages.length > 0) {
    Console.log(chalk.red('[ESLINT]'), fileName);

    console.log(eslintReporter(report.results));
  }
}
//
// var Linter = require("eslint").Linter;
// var linter = new Linter();
//
// var messages = linter.verify("var foo;console.log('hi')", {
//     rules: {
//         semi: 2
//     }
// }, { filename: "foo.js" });

//
// [{
//   filePath: "foo.js",
//   source: "const foo = 1\n",
//   messages: [{
//       message: "Missing semicolon.",
//       severity: 2,
//       line: 1,
//       column: 14,
//       ruleId: "semi"
//   }, {
//       message: "'foo' is assigned a value but never used.",
//       severity: 2,
//       line: 1,
//       column: 7,
//       ruleId: "no-unused-vars"
//   }],
//   errorCount: 2,
//   warningCount: 0
// }];
