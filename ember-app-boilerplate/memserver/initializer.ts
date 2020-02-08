import users from './fixtures/users';
import User from './models/user';

export default function() { // eslint-disable-line
  User.resetDatabase(users);
}
