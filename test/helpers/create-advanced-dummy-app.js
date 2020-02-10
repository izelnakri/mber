import fs from 'fs-extra';
import findProjectRoot from '../../lib/utils/find-project-root.js';
import createDummyApp from './create-dummy-app.js';

export default async function(appName = 'dummyapp', options = { memserver: false }) {
  const PROJECT_ROOT = await findProjectRoot();
  const APP_ROOT = `${PROJECT_ROOT}/${appName}`;

  return new Promise((resolvePromise) => {
    createDummyApp(appName)
      .then(() => {
        return fs.mkdirp(`${APP_ROOT}/src/data/models/user`);
      })
      .then(() => {
        const operations = [
          fs.writeFile(
            `${APP_ROOT}/src/data/models/user/model.ts`,
            `
          import DS from 'ember-data';

          const { Model, attr } = DS;

          export default class User extends Model {
            @attr('string') firstName;
            @attr('string') lastName;
            @attr('boolean') active;
          }
        `
          ),
          fs.writeFile(
            `${APP_ROOT}/src/ui/routes/index/route.ts`,
            `
          import RSVP from 'rsvp';
          import Route from '@ember/routing/route';

          export default class IndexRoute extends Route {
            model() {
              return RSVP.hash({
                activeUsers: this.store.query('user', { active: true })
              });
            }
          }
        `
          ),
          fs.writeFile(
            `${APP_ROOT}/src/ui/routes/index/template.hbs`,
            `
          <WelcomePage/>

          <div id="users">
            {{#each model.activeUsers as |activeUser|}}
              <h4>{{activeUser.firstName}} {{activeUser.lastName}}</h4>
            {{/each}}
          </div>
        `
          )
        ].concat(
          options.memserver
            ? [
                fs.writeFile(
                  `${APP_ROOT}/memserver/models/user.ts`,
                  `
          import Model from 'memserver/model';

          export default class User extends Model {
          }
        `
                ),
                fs.writeFile(
                  `${APP_ROOT}/memserver/fixtures/users.ts`,
                  `
          export default [
            {
              id: 1,
              first_name: 'Izel',
              last_name: 'Nakri',
              active: true
            },
            {
              id: 2,
              first_name: 'Ash',
              last_name: 'Belmokadem',
              active: true
            },
            {
              id: 3,
              first_name: 'Constantijn',
              last_name: 'van de Wetering',
              active: true
            }
          ];
        `
                ),
                fs.writeFile(`${APP_ROOT}/memserver/initializer.ts`, `
          import users from './fixtures/users';
          import User from './models/user';

          export default function() {
            User.resetDatabase(users);
          }
                `),
                fs.writeFile(`${APP_ROOT}/memserver/index.ts`, `
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
                `),
                fs.writeFile(
                  `${APP_ROOT}/memserver/routes.ts`,
                  `
          import ENV from '../config/environment';
          import User from './models/user';
          import Response from 'memserver/response';

          export default function() {
            this.urlPrefix = ENV.APP ? ENV.APP.API_HOST : 'http://localhost:3000';

            this.get('/users', ({ queryParams }) => {
              if (queryParams.active) {
                return {
                  users: User.serializer(User.findAll({ active: true }))
                };
              }

              return Response(422, { error: 'Unexpected error occured' })
            })
          }
        `
                )
              ]
            : []
        );

        return Promise.all(operations);
      })
      .then(() => resolvePromise(true))
      .catch((error) => console.log('createDummyApp error:', error));
  });
}

// TODO: also try fetch
// NOTE: maybe also write new unit tests
