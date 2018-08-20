import eslintReporter from 'eslint/lib/formatters/codeframe';

export default function(files, buildConfig) {
  const report = buildConfig.jsLinter.executeOnFiles(files);
  const result = eslintReporter(report.results);

  if (result) {
    console.log(result);
  }

  return result;
}
