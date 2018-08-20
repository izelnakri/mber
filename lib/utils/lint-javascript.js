import eslintReporter from 'eslint/lib/formatters/codeframe';

export default function(files, buildConfig={}) {
  if (buildConfig.jsLinter) {
    const report = buildConfig.jsLinter.executeOnFiles(files);
    const result = eslintReporter(report.results);

    if (result) {
      console.log(result);
    }

    return result;
  }
}
