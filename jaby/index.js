( function () {
	"use strict";

	function loadPlugins( plugins_path, plugins ) {
		var stat;
		var relativePath;
		var files, file, numFiles, i;

		if ( !plugins ) {
			plugins = {};
		}

		if ( !plugins_path ) {
			return plugins;
		}

		try {
			stat = fs.lstatSync( plugins_path );
			if ( stat ) {
				if ( stat.isDirectory() ) {
					//	Have a directory; do a tree walk
					files = fs.readdirSync( plugins_path );
					if ( files ) {
						numFiles = files.length;
						for ( i = 0; i < numFiles; i++ ) {
							file = path.join( plugins_path, files[ i ] );
							loadPlugins( file, plugins );
						}
					}
				}
				else {
					//	Have a file... is it JavaScript?
					if ( path.extname( plugins_path ) === ".js" ) {
						//	Load the file
						relativePath = path.relative( pluginsRoot, plugins_path ).replace( /^(?:\.\.\/)+/, "" );
						plugins[ relativePath ] = require( plugins_path );
					}
				}
			}
		}
		catch ( e ) {
			if ( e ) {
				jaby.logger.error( "Could not load plugin: %s", e, {} );
				if ( e.stack ) {
					jaby.logger.info( e.stack );
				}
			}
			else {
				jaby.logger.error( "Could not load plugin and no exception provided." );
			}
		}

		return plugins;
	}

	var fs = require( "fs" );
	var path = require( "path" );
	var broadway = require( "broadway" );
	var winston = require( "winston" );

	var pluginsRoot = path.join( __dirname, "plugins" );
	var plugin;

	var jaby = new broadway.App();
	jaby.logger = new( winston.Logger )( {
		transports: [
			new( winston.transports.Console )( {
				level: "info",
				colorize: true,
				timestamp: true
			} )
		]
	} );

	jaby.plugins = loadPlugins( pluginsRoot );

	for ( plugin in jaby.plugins ) {
		if ( jaby.plugins.hasOwnProperty( plugin ) ) {
			jaby.logger.info( "Using %s", plugin, {} );
			try {
				jaby.use( jaby.plugins[ plugin ], jaby );
			}
			catch ( e ) {
				jaby.logger.error( "Could not use %s: %s", plugin, e, {} );
			}
		}
	}

	jaby.init( function ( err ) {
		if ( err ) {
			this.logger.info( err );
		}
	} );

	module.exports = jaby;

} ).call( this );
