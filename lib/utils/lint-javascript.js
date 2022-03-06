import eslintReporter from 'eslint-formatter-codeframe';

export default async function(files, jsLinter) {
  const report = await jsLinter.lintFiles(files);

  if (report.length > 0) {
    let result = eslintReporter(report);
    if (result) {
      console.log(result);
    }

    return result;
  }
}
