( function () {
	"use strict";

	/**
	 * Loads the various application plugins (in the plugins directory) synchronously.
	 *
	 * @param  {String}	plugins_path	The path relative to server.
	 * @param  {Object}	plugins			The object to load plugins into. If not provided, an empty object is created and used.
	 * @returns  {Object}				The object containing loaded plugins.
	 */
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
						jaby.logger.info( "Loading: %s", relativePath );
						plugins[ relativePath ] = require( plugins_path );
					}
				}
			}
		}
		catch ( e ) {
			jaby.logger.error( "Could not load plugin: %s", e );
			if ( e.stack ) {
				jaby.logger.info( e.stack );
			}
		}

		return plugins;
	}

	var fs = require( "fs" );
	var path = require( "path" );
	var broadway = require( "broadway" );

	var pluginsRoot = path.join( __dirname, "plugins" );
	var plugin;

	var jaby = new broadway.App();
	jaby.logger = require( "winston" );

	jaby.plugins = loadPlugins( pluginsRoot );

	for ( plugin in jaby.plugins ) {
		if ( jaby.plugins.hasOwnProperty( plugin ) ) {
			jaby.logger.info( "Using %s", plugin );
			try {
				jaby.use( jaby.plugins[ plugin ], jaby );
			}
			catch ( e ) {
				jaby.logger.error( "Could not use %s: %s", plugin, e );
			}
		}
	}

	jaby.init( function ( err ) {
		if ( err ) {
			console.info( err );
		}
	} );

	module.exports = jaby;

} ).call( this );
