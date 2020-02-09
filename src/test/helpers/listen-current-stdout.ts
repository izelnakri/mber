import intercept from 'intercept-stdout';
import stripANSI from 'strip-ansi';

export default function() {
  const stdout = [];
  const stopStdoutInterception = intercept(function(text) {
    stdout.push(stripANSI(text));
  });
  stdout.length = 0;
  
  return { stdout, stopStdoutListening: stopStdoutInterception };
}
