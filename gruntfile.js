module.exports = function ( grunt ) {
	"use strict";

	var pkgSource = grunt.file.readJSON( "package.json" );

	grunt.initConfig( {
		pkg: pkgSource,
		clean: {
			public: [ "public/" ]
		},
		copy: {
			fonts: {
				expand: true,
				cwd: "lib/fonts",
				src: [ "**" ],
				dest: "public/fonts"
			},
			images: {
				expand: true,
				cwd: "lib/img",
				src: [ "**" ],
				dest: "public/img"
			}
		},
		browserify: {
			"public/js/jaby.js": [ "lib/js/jaby.js" ],
			"public/js/status.js": [ "lib/js/status.js" ],
			"public/js/application.js": [ "lib/js/application.js" ]
		},
		less: {
			application: {
				options: {
					paths: [ "lib/styles" ],
					strictImports: true,
					syncImport: true,
					yuicompress: true
				},
				files: [
					{
						expand: true,
						cwd: "lib/styles",
						src: [ "*.less" ],
						dest: "public/css",
						ext: ".css"
					}
				]
			},
			lib: {
				files: {
					"public/css/lib/bootstrap.css": "lib/styles/lib/bootstrap/bootstrap.less",
					"public/css/lib/font-awesome.css": "lib/styles/lib/font-awesome/font-awesome.less",
					"public/css/lib/ionicons.css": "lib/styles/lib/ionicons/ionicons.less"
				}
			}
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
			files: [ "gruntfile.js", "app.js", "config/**/*.js", "controllers/**/*.js", "jaby/**/*.js", "lib/js/*.js", "test/**/*.js", "!public/js/lib/**/*.js" ],
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

	grunt.loadNpmTasks( "grunt-browserify" );
	grunt.loadNpmTasks( "grunt-contrib-clean" );
	grunt.loadNpmTasks( "grunt-contrib-copy" );
	grunt.loadNpmTasks( "grunt-contrib-less" );
	grunt.loadNpmTasks( "grunt-contrib-jshint" );
	grunt.loadNpmTasks( "grunt-contrib-watch" );
	grunt.loadNpmTasks( "grunt-mocha-test" );

	grunt.registerTask( "test", [ "jshint", "mochaTest" ] );

	grunt.registerTask( "default", [ "jshint" ] );

	grunt.registerTask( "build", [ "clean", "browserify", "copy", "less", "test" ] );
};