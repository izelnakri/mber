import users from './fixtures/users';
import User from './models/user';

export default function() {
  User.resetDatabase(users);
}
