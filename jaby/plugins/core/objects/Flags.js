( function () {
	"use strict";

	var Flags = function ( flags ) {

		var numFlags, i, flag;

		if ( flags ) {
			if ( typeof flags === "string" ) {
				this[ flags ] = true;
			}
			else {
				if ( Array.isArray( flags ) ) {
					numFlags = flags.length;
					for ( i = 0; i < numFlags; i++ ) {
						flag = flags[ i ];
						if ( flag && typeof flag === "string" ) {
							this[ flag ] = true;
						}
					}
				}
				else {
					if ( typeof flags === "object" ) {
						for ( flag in flags ) {
							if ( flags.hasOwnProperty( flag ) ) {
								this[ flag ] = true;
							}
						}
					}
				}
			}
		}

	};

	module.exports = Flags;

} ).call( this );
