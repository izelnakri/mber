export default function(targetCWD) {
  const oldProcessCWD = process.cwd;

  process.cwd = () => targetCWD;

  return {
    removeMock() {
      process.cwd = oldProcessCWD;
    }
  }
}
