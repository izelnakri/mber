require('@babel/register')({
  presets: ['@babel/preset-env']
});

process.title = 'mber';

module.exports = require('./main').default;
