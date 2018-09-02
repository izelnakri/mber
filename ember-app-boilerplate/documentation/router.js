export default function(ENV) {
  this.route('documentation', { path: ENV.documentation.path }, function() {
    this.route('index', { path: '/' });

    this.route('buttons');
    this.route('color-scheme');

    this.route('components', function() {
      this.route('demo');
      this.route('snippet');
      this.route('header');
      this.route('viewer');
    });
  });
}
