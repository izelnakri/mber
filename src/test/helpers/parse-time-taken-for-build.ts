export function getTimeTakenForApplicationCSS(message) {
  return Number(message.match(/application\.css in \d+ms/g)[0]
    .replace('application.css in ', '')
    .replace('ms', ''));
}

export function getTimeTakenForApplicationJS(message) {
  return Number(message.match(/application\.js in \d+ms/g)[0]
    .replace('application.js in ', '')
    .replace('ms', ''));
}

export function getTimeTakenForVendorJS(message) {
  return Number(message.match(/vendor\.js in \d+ms/g)[0]
    .replace('vendor.js in ', '')
    .replace('ms', ''));
}

export function getTimeTakenForMemServerJS(message) {
  return Number(message.match(/memserver\.js in \d+ms/g)[0]
    .replace('memserver.js in ', '')
    .replace('ms', ''));
}
