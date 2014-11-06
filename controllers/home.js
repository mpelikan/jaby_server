( function () {
	"use strict";

	/**
	 * GET /
	 * Home page.
	 */
	exports.home = function ( req, res ) {
		res.render( "home2", {
			title: "Home"
		} );
	};

} ).call( this );