( function () {
	"use strict";

	var broadway = require( "broadway" );
	var jaby = new broadway.App();

	// Passes the second argument to `helloworld.attach`.
	jaby.use( require( "./plugins/helloworld" ), {
		"delimiter": "!"
	} );

	jaby.use( require( "./plugins/orb" ), {} );

	jaby.init( function ( err ) {
		if ( err ) {
			console.log( err );
		}
	} );

	jaby.hello( "world" );
	jaby.emit( "world:hello", {
		meta: "is here"
	} );

	module.exports = jaby;

} ).call( this );