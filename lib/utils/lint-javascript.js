import eslintReporter from 'eslint/lib/formatters/codeframe';

export default function(files, buildConfig) {
  const report = buildConfig.jsLinter.executeOnFiles(files);

  console.log(eslintReporter(report.results));
}
