/**
 * IMPORTANT * IMPORTANT * IMPORTANT * IMPORTANT * IMPORTANT * IMPORTANT *
 *
 * You should never commit this file to a public repository on GitHub!
 * All public code on GitHub can be searched, that means anyone can see your
 * uploaded secrets.js file.
 *
 * I did it for your convenience using "throw away" credentials so that
 * all features could work out of the box.
 *
 * Untrack secrets.js before pushing your code to public GitHub repository:
 *
 * git rm --cached config/secrets.js
 *
 * If you have already committed this file to GitHub with your keys, then
 * refer to https://help.github.com/articles/remove-sensitive-data
 */
( function () {

	"use strict";

	var privateSecrets;
	var secrets = {

		db: process.env.MONGODB || "mongodb://localhost:27016",
		jabyDB: ( process.env.MONGODB || "mongodb://localhost:27016" ) + "/jaby",

		sessionSecret: process.env.SESSION_SECRET || "12456789-abcd-4567-efab-7890cdef1234",

		nyt: {
			key: process.env.NYT_KEY || "not_set"
		},

		lastfm: {
			api_key: process.env.LASTFM_KEY || "not_set",
			secret: process.env.LASTFM_SECRET || "is not_set"
		},

		facebook: {
			//	Test version of Jaby
			clientID: process.env.FACEBOOK_ID || "1501704606728004",
			clientSecret: process.env.FACEBOOK_SECRET || "2bd4bc785122de66c1777f3163df553e",
			callbackURL: "/auth/facebook/callback",
			passReqToCallback: true
		},

		instagram: {
			//	TODO: Using Hackathon Starter... need to change
			clientID: process.env.INSTAGRAM_ID || "9f5c39ab236a48e0aec354acb77eee9b",
			clientSecret: process.env.INSTAGRAM_SECRET || "5920619aafe842128673e793a1c40028",
			callbackURL: "/auth/instagram/callback",
			passReqToCallback: true
		},

		github: {
			//	GitHub Development key is bound to http://127.0.0.1:3000/auth/github/callback
			clientID: process.env.GITHUB_ID || "cf69403ed761cc228d57",
			clientSecret: process.env.GITHUB_SECRET || "145b6e6de78e6b4e0874dc8101956dda9cc97709",
			callbackURL: "/auth/github/callback",
			passReqToCallback: true
		},

		twitter: {
			//	Twitter Development key is bound to http://127.0.0.1:3000/auth/twitter/callback
			consumerKey: process.env.DEV_TWITTER_KEY || "Wo1RgnUHDEWBpSFkfIy94sPJJ",
			consumerSecret: process.env.DEV_TWITTER_SECRET || "IRuRb0qVnrwuoc1bJ7JnuL8pyYMWzVa8eQX9L4qmmTQdYNgiM3",

			callbackURL: "/auth/twitter/callback",
			passReqToCallback: true
		},

		google: {
			//	Localhost
			clientID: process.env.GOOGLE_ID || "683918218809-gfenc1rs4auqr3uuflq7b241blendfti.apps.googleusercontent.com",
			clientSecret: process.env.GOOGLE_SECRET || "b-GETdwH57cNA2YcMhKM3hfn",

			callbackURL: "/auth/google/callback",
			passReqToCallback: true
		},

		linkedin: {
			clientID: process.env.LINKEDIN_ID || "not_set",
			clientSecret: process.env.LINKEDIN_SECRET || "not_set",
			callbackURL: "/auth/linkedin/callback",
			scope: [ "r_basicprofile", "r_fullprofile", "r_emailaddress", "r_network" ],
			passReqToCallback: true
		},

		tumblr: {
			consumerKey: process.env.TUMBLR_KEY || "not_set",
			consumerSecret: process.env.TUMBLR_SECRET || "not_set",
			callbackURL: "/auth/tumblr/callback"
		}

	};

	function mergeConfig( config1, config2 ) {
		var property;

		for ( property in config2 ) {
			if ( config2.hasOwnProperty( property ) ) {
				try {
					//	Property in destination config set; update its value.
					if ( config2[ property ].constructor === Object ) {
						config1[ property ] = mergeConfig( config1[ property ], config2[ property ] );

					}
					else {
						config1[ property ] = config2[ property ];
					}

				}
				catch ( e ) {
					//	Property in destination config not set; create it and set its value.
					config1[ property ] = config2[ property ];

				}
			}
		}

		return config1;
	}

	//	To override in a way in which you can commit the secrets.js file to GitHub, etc., there is an override
	//	ability. Place your "private" configuration into private.js.
	//
	//	**************************************************
	//	DO NOT COMMIT YOUR private.js FILE TO GITHUB, etc.
	//	**************************************************
	try {
		privateSecrets = require( "./private.js" );
		if ( privateSecrets ) {
			mergeConfig( secrets, privateSecrets );
		}
	}
	catch ( e ) {
		if ( e ) {
			if ( e.code === "MODULE_NOT_FOUND" ) {
				//	Nothing to do. There just isn't a private override of configuration
			}
			else {
				console.error( "Could not load private secrets: %s", JSON.stringify( e, null, "\t" ) );
			}
		}
		else {
			console.error( "Could not override secrets: %s", JSON.stringify( e, null, "\t" ) );
		}
	}

	module.exports = secrets;

} ).call( this );
