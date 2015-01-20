( function () {
	"use strict";

	var Knowledge = function ( type, options ) {

		var property;

		this.type = type;

		if ( options ) {
			for ( property in options ) {
				if ( options.hasOwnProperty( property ) ) {
					this[ property ] = options[ property ];
				}
			}
		}

		return this;
	};

	module.exports = Knowledge;

} ).call( this );
