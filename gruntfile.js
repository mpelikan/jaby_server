module.exports = function ( grunt ) {
	"use strict";

	var pkgSource = grunt.file.readJSON( "package.json" );

	grunt.initConfig( {
		pkg: pkgSource,
		bower: {
			install: {
				options: {
					targetDir: "third-party/bower_components",
					layout: "byComponent",
					verbose: true,
					cleanTargetDir: true,
					copy: false
				}
			}
		},
		clean: {
			all: [ "public/", "third-party/bower_components/" ]
		},
		copy: {
			html: {
				expand: true,
				cwd: "lib/html",
				src: [ "**" ],
				dest: "public"
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
			third_party_fonts: {
				expand: true,
				cwd: "lib/fonts",
				src: [ "**" ],
				dest: "public/third-party/fonts"
			},
			third_party_bower: {
				expand: true,
				cwd: "third-party/bower_components",
				src: [ "**" ],
				dest: "public/third-party"
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
				files: [ {
					expand: true,
					cwd: "lib/styles",
					src: [ "*.less" ],
					dest: "public/css",
					ext: ".css"
				} ]
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
		jsbeautifier: {
			files: [
				"gruntfile.js", "server.js", "config/**/*.js", "controllers/**/*.js", "jaby/**/*.js",
				"lib/js/*.js", "test/**/*.js", "!public/js/lib/**/*.js",
				"!public/third-party/**/*.js", "!third-party/**/*.js"
			],
			options: {
				config: ".jsbeautifyrc"
			}
		},
		jshint: {
			files: [
				"gruntfile.js", "server.js", "config/**/*.js", "controllers/**/*.js", "jaby/**/*.js",
				"models/**/*.js", "lib/js/*.js", "test/**/*.js", "!public/js/lib/**/*.js",
				"!public/third-party/**/*.js", "!third-party/**/*.js"
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

	grunt.loadNpmTasks( "grunt-jsbeautifier" );
	grunt.loadNpmTasks( "grunt-bower-task" );
	grunt.loadNpmTasks( "grunt-contrib-clean" );
	grunt.loadNpmTasks( "grunt-contrib-copy" );
	grunt.loadNpmTasks( "grunt-contrib-less" );
	grunt.loadNpmTasks( "grunt-contrib-jshint" );
	grunt.loadNpmTasks( "grunt-contrib-watch" );
	grunt.loadNpmTasks( "grunt-mocha-test" );
	grunt.loadNpmTasks( "grunt-npm-install" );

	grunt.registerTask( "default", [ "jsbeautifier", "jshint" ] );

	grunt.registerTask( "test", [ "jsbeautifier", "jshint", "mochaTest" ] );

	grunt.registerTask( "build", [ "bower", "copy", "less", "test" ] );

	grunt.registerTask( "full", [ "clean", "npm-install", "build" ] );
};
