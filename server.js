( function () {
	"use strict";

	var jaby = require( "./jaby" );

	var express = require( "express" );
	var session = require( "express-session" );
	var MongoStore = require( "connect-mongo" )( session );
	var cookieParser = require( "cookie-parser" );
	var compress = require( "compression" );
	var bodyParser = require( "body-parser" );
	var logger = require( "morgan" );
	var errorHandler = require( "errorhandler" );
	var csrf = require( "lusca" ).csrf();
	var methodOverride = require( "method-override" );
	var _ = require( "lodash" );
	var path = require( "path" );
	var mongoose = require( "mongoose" );
	var passport = require( "passport" );
	var expressValidator = require( "express-validator" );

	/**
	 * Controllers (route handlers).
	 */
	var jabyController = require( "./controllers/jaby" );

	/**
	 * API keys and Passport configuration.
	 */
	var secrets = require( "./config/secrets" );
	require( "./config/passport" );

	/**
	 * CSRF white-list
	 */
	var csrfExclude = [ "/url1", "/url2" ];

	var port = process.env.PORT || 3000;

	/**
	 * Create Express server
	 */
	var app = express();

	/**
	 * Setup Socket.io
	 */
	var server = require( "http" ).Server( app );
	var io = require( "socket.io" )( server );
	var passportSocketIo = require( "passport.socketio" );

	var sessionStore;

	var hour = 3600000; //milliseconds
	var day = ( hour * 24 );
	var week = ( day * 7 );

	/**
	 * Connect to MongoDB
	 */
	mongoose.connect( secrets.jabyDB );
	mongoose.connection.on( "error", function () {
		console.error( "MongoDB Connection Error. Make sure MongoDB is running." );
	} );

	sessionStore = new MongoStore( {
		mongooseConnection: mongoose.connections[ 0 ]
	} );

	/**
	 * Express configuration.
	 */
	app.set( "port", port );
	app.use( compress() );
	app.use( logger( "dev" ) );
	app.use( bodyParser.json() );
	app.use( bodyParser.urlencoded( {
		extended: true
	} ) );
	app.use( expressValidator() );
	app.use( methodOverride() );
	app.use( cookieParser() );

	app.use( session( {
		resave: true,
		saveUninitialized: true,
		secret: secrets.sessionSecret,
		store: sessionStore
	} ) );
	app.use( passport.initialize() );
	app.use( passport.session() );

	app.use( function ( req, res, next ) {
		//	CSRF protection.
		if ( _.contains( csrfExclude, req.path ) ) {
			return next();
		}
		csrf( req, res, next );
	} );

	app.use( function ( req, res, next ) {
		//	Make user object available in templates.
		res.locals.user = req.user;
		if ( req.user ) {
			req.session.userDB = secrets.db + "/" + req.user._id.toString();
		}
		next();
	} );

	app.use( function ( req, res, next ) {
		req.session.returnTo = "/";
		next();
	} );

	app.use( express.static( path.join( __dirname, "public" ), {
		maxAge: week
	} ) );

	/**
	 * Main routes.
	 */
	app.get( "/", jabyController.index );
	app.get( "/login", jabyController.login );
	app.get( "/logout", jabyController.logout );

	/**
	 * OAuth sign-in routes.
	 */
	app.get( "/auth/instagram", passport.authenticate( "instagram" ) );
	app.get( "/auth/instagram/callback", passport.authenticate( "instagram", {
		failureRedirect: "/login"
	} ), function ( req, res ) {
		res.redirect( req.session.returnTo || "/" );
	} );
	app.get( "/auth/facebook", passport.authenticate( "facebook", {
		scope: [ "email", "user_location" ]
	} ) );
	app.get( "/auth/facebook/callback", passport.authenticate( "facebook", {
		failureRedirect: "/login"
	} ), function ( req, res ) {
		res.redirect( req.session.returnTo || "/" );
	} );
	app.get( "/auth/github", passport.authenticate( "github" ) );
	app.get( "/auth/github/callback", passport.authenticate( "github", {
		failureRedirect: "/login"
	} ), function ( req, res ) {
		res.redirect( req.session.returnTo || "/" );
	} );
	app.get( "/auth/google", passport.authenticate( "google", {
		scope: "profile email"
	} ) );
	app.get( "/auth/google/callback", passport.authenticate( "google", {
		failureRedirect: "/login"
	} ), function ( req, res ) {
		res.redirect( req.session.returnTo || "/" );
	} );
	app.get( "/auth/twitter", passport.authenticate( "twitter" ) );
	app.get( "/auth/twitter/callback", passport.authenticate( "twitter", {
		failureRedirect: "/login"
	} ), function ( req, res ) {
		res.redirect( req.session.returnTo || "/" );
	} );
	app.get( "/auth/linkedin", passport.authenticate( "linkedin", {
		state: "SOME STATE"
	} ) );
	app.get( "/auth/linkedin/callback", passport.authenticate( "linkedin", {
		failureRedirect: "/login"
	} ), function ( req, res ) {
		res.redirect( req.session.returnTo || "/" );
	} );

	/**
	 * OAuth authorization routes for API examples.
	 */
	// app.get( "/auth/foursquare", passport.authorize( "foursquare" ) );
	// app.get( "/auth/foursquare/callback", passport.authorize( "foursquare", {
	// 	failureRedirect: "/api"
	// } ), function ( req, res ) {
	// 	res.redirect( "/api/foursquare" );
	// } );
	app.get( "/auth/tumblr", passport.authorize( "tumblr" ) );
	app.get( "/auth/tumblr/callback", passport.authorize( "tumblr", {
		failureRedirect: "/api"
	} ), function ( req, res ) {
		res.redirect( "/api/tumblr" );
	} );
	app.get( "/auth/venmo", passport.authorize( "venmo", {
		scope: "make_payments access_profile access_balance access_email access_phone"
	} ) );
	app.get( "/auth/venmo/callback", passport.authorize( "venmo", {
		failureRedirect: "/api"
	} ), function ( req, res ) {
		res.redirect( "/api/venmo" );
	} );

	/**
	 * 500 Error Handler.
	 */
	app.use( errorHandler() );

	/**
	 * Start Express server.
	 */
	server.listen( app.get( "port" ), function () {
		console.log( "Jaby server listening on port %d in %s mode", app.get( "port" ), app.get( "env" ) );
	} );

	function onAuthorizeSuccess( data, accept ) {
		console.log( "Successful connection to socket.io" );

		accept();
	}

	function onAuthorizeFail( data, message, error, accept ) {
		if ( error ) {
			throw new Error( message );
		}

		console.log( "Failed connection to socket.io: ", message );

		if ( error ) {
			accept( new Error( message ) );
		}
	}

	io.use( passportSocketIo.authorize( {
		cookieParser: cookieParser,
		key: "connect.sid",
		secret: secrets.sessionSecret,
		store: sessionStore,
		success: onAuthorizeSuccess,
		fail: onAuthorizeFail
	} ) );

	io.on( "connection", function ( socket ) {
		jaby.registerSocket( io, socket );
	} );

	module.exports = app;

} ).call( this );
