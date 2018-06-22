require('babel-register')({
  presets: ['env']
});

process.title = 'mber';

module.exports = require('./main').default;
