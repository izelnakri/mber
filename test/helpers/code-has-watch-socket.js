export default function(code) {
  return code.includes("window.socket = new WebSocket('ws://localhost:65511');") ||
    code.includes('window.socket=');
}
