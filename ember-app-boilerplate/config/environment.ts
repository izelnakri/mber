export default config;

/**
 * type declarations for
 *    import config from './config/environment'
 *
 * for now these need to be managed by the developer
 * since different ember addons can materialize new entries.
 */
declare const config: {
  app: app;
  environment: any;
  moduleprefix: string;
  podmoduleprefix: string;
  locationtype: string;
  rooturl: string;
  [propname: string]: any;
};

interface app {
  [propname: string]: any;
}
