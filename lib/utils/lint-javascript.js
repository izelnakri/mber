import eslintReporter from 'eslint/lib/cli-engine/formatters/codeframe.js';

export default function(files, jsLinter) {
  const report = jsLinter.executeOnFiles(files);
  const result = eslintReporter(report.results);

  if (result) {
    console.log(result);
  }

  return result;
}
