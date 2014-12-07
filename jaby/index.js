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
					//	Have a file; load it
					plugins[ plugins_path ] = require( plugins_path );
				}
			}
		}
		catch ( e ) {
			console.error( "Could not load plugin: %s", e );
		}

		return plugins;
	}

	var fs = require( "fs" );
	var path = require( "path" );
	var broadway = require( "broadway" );

	var jaby = new broadway.App();
	var plugins = loadPlugins( path.join( __dirname, "plugins" ) );
	var plugin;

	for ( plugin in plugins ) {
		if ( plugins.hasOwnProperty( plugin ) ) {
			console.info( "Using %s", plugin );
			try {
				jaby.use( plugins[ plugin ], {} );
			}
			catch ( e ) {
				console.error( "Could not use %s: %s", plugin, e );
			}
		}
	}

	jaby.plugins = plugins;

	jaby.init( function ( err ) {
		if ( err ) {
			console.log( err );
		}
	} );

	module.exports = jaby;

} ).call( this );
