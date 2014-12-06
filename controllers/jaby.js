( function () {
	"use strict";

	exports.index = function ( req, res ) {
		var jabyHTML = require.resolve( "../public/jaby.html" );

		if ( !req.user ) {
			return res.redirect( "/auth/twitter" );
		}

		res.status( 200 ).sendFile( jabyHTML );
	};

	exports.login = function ( req, res ) {
		res.redirect( "/auth/twitter" );
	};

	exports.logout = function ( req, res ) {
		req.logout();
		res.redirect( "/" );
	};

} ).call( this );
