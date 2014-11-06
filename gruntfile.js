module.exports = function ( grunt ) {
	"use strict";

	var pkgSource = grunt.file.readJSON( "package.json" );

	grunt.initConfig( {
		pkg: pkgSource,
		bower: {
			install: {}
		},
		mochaTest: {
			test: {
				options: {
					reporter: "spec",
					quiet: true,
					clearRequireCache: true
				},
				src: [ "test/**/*.js" ]
			}
		},
		jshint: {
			files: [ "gruntfile.js", "app.js", "config/**/*.js", "controllers/**/*.js", "jaby/**/*.js", "public/**/*.js", "test/**/*.js", "!public/js/lib/**/*.js" ],
			options: {
				jshintrc: ".jshintrc"
			}
		},
		watch: {
			js: {
				files: [ "<%= jshint.files %>" ],
				tasks: [ "jshint" ]
			},
			css: {
				files: [
					"public/css/**/*.less"
				],
				tasks: [ "less" ]
			},
			test: {
				options: {
					spawn: false,
				},
				files: [ "test/**/*" ],
				tasks: [ "mochaTest" ]
			},
		}
	} );

	grunt.loadNpmTasks( "grunt-bower-task" );
	grunt.loadNpmTasks( "grunt-contrib-less" );
	grunt.loadNpmTasks( "grunt-contrib-jshint" );
	grunt.loadNpmTasks( "grunt-contrib-watch" );
	grunt.loadNpmTasks( "grunt-mocha-test" );

	grunt.registerTask( "test", [ "jshint", "mochaTest" ] );

	grunt.registerTask( "default", [ "jshint" ] );

	grunt.registerTask( "build", [ "test", "bower", "less" ] );
};