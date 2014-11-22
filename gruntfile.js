module.exports = function ( grunt ) {
	"use strict";

	var pkgSource = grunt.file.readJSON( "package.json" );

	grunt.initConfig( {
		pkg: pkgSource,
		bower: {
			install: {
				options: {
					targetDir: "vendor/bower_components",
					layout: "byComponent",
					verbose: true,
					cleanup: true
				}
			}
		},
		clean: {
			public: [ "public/" ]
		},
		copy: {
			html: {
				expand: true,
				cwd: "lib/html",
				src: [ "**" ],
				dest: "public"
			},
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
			},
			js: {
				expand: true,
				cwd: "lib/js",
				src: [ "**" ],
				dest: "public/js"
			},
			vendor: {
				expand: true,
				cwd: "vendor/bower_components",
				src: [ "**" ],
				dest: "public/vendor"
			}
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
			files: [
				"gruntfile.js", "server.js", "config/**/*.js", "controllers/**/*.js", "jaby/**/*.js",
				"lib/js/*.js", "test/**/*.js", "!public/js/lib/**/*.js",
				"!public/vendor/**/*.js", "!vendor/**/*.js"
			],
			options: {
				jshintrc: ".jshintrc"
			}
		},
		watch: {
			js: {
				files: [ "<%= jshint.files %>" ],
				tasks: [ "build" ]
			},
			html: {
				files: [
					"lib/html/**/*.html"
				],
				tasks: [ "build" ]
			},
			css: {
				files: [
					"lib/styles/**/*.less"
				],
				tasks: [ "less" ]
			},
			test: {
				options: {
					spawn: false,
				},
				files: [ "test/**/*" ],
				tasks: [ "build" ]
			},
		}
	} );

	grunt.loadNpmTasks( "grunt-bower-task" );
	grunt.loadNpmTasks( "grunt-contrib-clean" );
	grunt.loadNpmTasks( "grunt-contrib-copy" );
	grunt.loadNpmTasks( "grunt-contrib-less" );
	grunt.loadNpmTasks( "grunt-contrib-jshint" );
	grunt.loadNpmTasks( "grunt-contrib-watch" );
	grunt.loadNpmTasks( "grunt-mocha-test" );

	grunt.registerTask( "test", [ "jshint", "mochaTest" ] );

	grunt.registerTask( "default", [ "jshint" ] );

	grunt.registerTask( "build", [ "clean", "bower", "copy", "less", "test" ] );
};