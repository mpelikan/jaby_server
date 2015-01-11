( function () {
	"use strict";

	var mongoose = require( "mongoose" );

	var answerSchema = new mongoose.Schema( {

		question: String,
		answer: String

	} );

	module.exports = mongoose.model( "Answer", answerSchema, "facts" );

} ).call( this );
