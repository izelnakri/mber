import fs from 'fs-extra';
import findProjectRoot from '../../lib/utils/find-project-root';
import createDummyApp from './create-dummy-app';

export default async function(appName='dummyapp', options={ memserver: false }) {
  const PROJECT_ROOT = await findProjectRoot();
  const APP_ROOT = `${PROJECT_ROOT}/${appName}`;

  return new Promise((resolvePromise) => {
    createDummyApp(appName).then(() => {
      return fs.mkdirp(`${APP_ROOT}/src/data/models/user`);
    }).then(() => {
      const operations = [
        fs.writeFile(`${APP_ROOT}/src/data/models/user/model.js`, `
          import DS from 'ember-data';

          export default DS.Model.extend({
            firstName: DS.attr('string'),
            lastName: DS.attr('string'),
            active: DS.attr('boolean')
          });
        `),
        fs.writeFile(`${APP_ROOT}/src/ui/routes/index/route.js`, `
          import RSVP from 'rsvp';
          import Route from '@ember/routing/route';

          export default Route.extend({
            model() {
              return RSVP.hash({
                activeUsers: this.get('store').query('user', { active: true })
              });
            }
          });
        `),
        fs.writeFile(`${APP_ROOT}/src/ui/routes/index/template.hbs`, `
          {{welcome-page}}

          <div id="users">
            {{#each model.activeUsers as |activeUser|}}
              <h4>{{activeUser.firstName}} {{activeUser.lastName}}</h4>
            {{/each}}
          </div>
        `)
      ].concat(options.memserver ? [
        fs.writeFile(`${APP_ROOT}/memserver/models/user.js`, `
          import Model from 'memserver/model';

          export default Model({
          });
        `),
        fs.writeFile(`${APP_ROOT}/memserver/fixtures/users.js`, `
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
        `),
        fs.writeFile(`${APP_ROOT}/memserver/server.js`, `
          import ENV from '../config/environment';
          import Response from 'memserver/response';

          export default function(Models) {
            const { User } = Models;

            this.urlPrefix = ENV.APP ? ENV.APP.API_HOST : 'http://localhost:3000';

            this.get('/users', ({ headers, queryParams }) => {
              if (queryParams.active) {
                return {
                  users: User.serializer(User.findAll({ active: true }))
                };
              }

              return Response(422, { error: 'Unexpected error occured' })
            })
          }
        `)
      ] : []);

      return Promise.all(operations);
    }).then(() => resolvePromise(true))
      .catch((error) => console.log('createDummyApp error:', error));
  });
}

// TODO: also try fetch
// NOTE: maybe also write new unit tests
