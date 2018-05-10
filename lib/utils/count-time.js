export default function() {
  const startTime = new Date();

  return {
    stop: () => +(new Date()) - (+startTime)
  };
}
