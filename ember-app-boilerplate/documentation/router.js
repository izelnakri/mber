export default function(ENV) {
  this.route('documentation', { path: ENV.documentation.path }, function() {
    this.route('index', { path: '/' });

    this.route('introduction');
    this.route('components');
  });
}
