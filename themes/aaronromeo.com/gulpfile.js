var gulp = require('gulp'),
    compass = require('gulp-compass'),
    notify = require('gulp-notify'),
    imagemin = require('gulp-imagemin'),
    pngcrush = require('imagemin-pngcrush');

var onError = function(err) {
    console.log(err);
}

gulp.task('sass-compass', function() {
  return gulp.src('./sass/main.scss')
  .pipe(compass({
    config_file: './config.rb',
    css: 'static/css',
    sass: 'sass',
    require: ['susy']
  }))
  .pipe(gulp.dest('static/css'))
  .pipe(notify({ message: 'Styles task complete' }));
});

gulp.task('image-min', function () {
    return gulp.src('./images/*')
        .pipe(imagemin({
            progressive: true,
            svgoPlugins: [{removeViewBox: false}],
            use: [pngcrush()]
        }))
        .pipe(gulp.dest('static/images'));
});

gulp.task('watch', function() {
// Check for modifications in particular directories

    // Whenever a stylesheet is changed, recompile
    gulp.watch('./sass/**/*.scss', ['sass-compass']);
    gulp.watch('./images/**/*.*', ['image-min']);

});

gulp.task('default', ['sass-compass', 'image-min', 'watch']);
