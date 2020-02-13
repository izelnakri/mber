declare global {
  interface Window {
    Memserver?: any;
    MemServer?: any;
  }
}

import Memserver from "memserver/server";
import initializer from "./initializer";
import routes from "./routes";

const MemServer = new Memserver({
  globalizeModels: true,
  initializer: initializer,
  routes: routes
});

window.Memserver = Memserver;
window.MemServer = MemServer;

export default MemServer;
