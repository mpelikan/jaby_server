( function () {
	"use strict";

	exports.index = function ( req, res ) {
		if ( !req.user ) {
			return res.redirect( "/login" );
		}
		res.render( "home", {
			title: "Jaby"
		} );
	};

	exports.status = function ( req, res ) {
		if ( !req.user ) {
			return res.redirect( "/login" );
		}
		res.render( "status", {
			title: "Status"
		} );
	};

} ).call( this );