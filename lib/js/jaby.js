/* jshint browser:true, devel:true */
/* global io, visibly, communiqué */
( function ( window, document, exportName ) {
	"use strict";

	var jaby = {
		version: "0.1.0",
		connected: false,
		on: false,
		online: true,
		error: false,
		warning: false,
		lastStatus: null,
		waitStatus: 10 * 1000,
		waitStatusBeforeWarning: 15 * 1000,
		waitStatusBeforeOffline: 30 * 1000,
		progressiveText: true,
		rotateStep: 1,
		rotateDeg: 0,
		core_radius: 0,
		pulse: {
			direction: 1,
			rate: 1,
			rateGoal: 1,
			radius: 0,
			maxRadius: 15
		},
		waitMessageBeforeDeleting: 10 * 1000
	};

	jaby.getTextContent = function getTextContent( element ) {
		if ( element ) {
			if ( element.textContent && typeof ( element.textContent ) !== "undefined" ) {
				return element.textContent;
			}
			else {
				return element.innerText;
			}
		}
	};

	jaby.onStatus = function onStatus( data ) {
		if ( data && data.message ) {
			this.lastStatus = new Date();
			this.setStatus( data.message );
			this.setActivityLoad( data.usage );
			// console.info( data.timeZoneName ? data.timeZoneName : "no timezone data" );
		}
	};

	jaby.pulseCore = function pulseCore() {
		this.pulse.radius += this.pulse.rate * this.pulse.direction;
		this.inner_core.setAttribute( "r", this.core_radius + this.pulse.radius );
		this.inner_power.setAttribute( "r", this.core_radius + this.pulse.radius );

		if ( this.pulse.radius >= this.pulse.maxRadius || this.pulse.radius <= 0 ) {
			this.pulse.direction *= -1;

			if ( this.pulse.radius <= 0 ) {
				if ( this.pulse.rate < this.pulse.rateGoal ) {
					this.pulse.rate++;
				}
				else {
					if ( this.pulse.rate > this.pulse.rateGoal ) {
						this.pulse.rate--;
					}
				}
			}
		}
	};

	jaby.rotateSphere = function rotateSphere() {
		this.rotateDeg = ( this.rotateDeg + this.rotateStep ) % 360;
		this.rotated_sphere.setAttribute( "transform", "rotate( " + this.rotateDeg + ", 350, 350 )" );
	};

	jaby.animate = function animate() {
		if ( this.on ) {
			this.pulseCore();
			this.rotateSphere();

			if ( this.raised < 1 ) {
				this.raised += 0.1;
				this.raiseOrb();
			}
		}
		else {
			if ( this.raised > 0 ) {
				this.raised -= 0.1;
				this.raiseOrb();
			}
		}
	};

	jaby.raiseOrb = function raiseOrb() {
		var raiseBy, radiusRatio;

		if ( this.raised > 0.99 ) {
			this.raised = 1;
		}
		if ( this.raised < 0.01 ) {
			this.raised = 0;
		}

		raiseBy = this.raisedHeight - ( this.raised * this.raisedHeight );
		this.sphere.setAttribute( "transform", "translate( 0 " + raiseBy + " )" );

		radiusRatio = 1 + ( ( 1 - this.raised ) * 0.2 );
		this.shadow.setAttribute( "rx", radiusRatio * this.shadowRadiusX );
		this.shadow.setAttribute( "ry", radiusRatio * this.shadowRadiusY );

		if ( this.off && this.raised === 0 ) {
			this.turnOffAnimation();
		}
	};

	jaby.turnOnAnimation = function turnOnAnimation() {
		var self = this;

		if ( !this.animationTimer ) {
			this.animationTimer = setInterval( function () {
				self.animate();
			}, 100 );
		}
	};

	jaby.turnOffAnimation = function turnOffAnimation() {
		if ( this.animationTimer ) {
			clearInterval( this.animationTimer );
			delete( this.animationTimer );
		}
	};

	jaby.turnOnPolling = function turnOnPolling() {
		var self = this;

		this.status();

		if ( !this.pollingTimer ) {
			this.pollingTimer = setInterval( function () {
				self.status();
			}, 10000 );
		}
	};

	jaby.turnOffPolling = function turnOffPolling() {
		if ( this.pollingTimer ) {
			clearInterval( this.pollingTimer );
			delete( this.pollingTimer );
		}
	};

	jaby.setCoreColor = function setCoreColor( color ) {
		var i;
		var numStops = this.stops.length;

		for ( i = 0; i < numStops; i++ ) {
			this.stops[ i ].setAttribute( "stop-color", color );
		}
	};

	jaby.setPowerColor = function setInnerColor( color ) {
		this.inner_power.setAttribute( "fill", color );
	};

	jaby.setOrbColor = function animate() {
		if ( this.on ) {
			this.setPowerColor( "#ff0" );

			if ( this.online ) {
				if ( this.error ) {
					this.setCoreColor( "#900" );
				}
				else {
					if ( this.warning ) {
						this.setCoreColor( "#960" );
					}
					else {
						if ( this.notification ) {
							this.setCoreColor( "#009" );
						}
						else {
							this.setCoreColor( "#090" );
						}
					}
				}
			}
			else {
				this.setCoreColor( "#666" );
			}
		}
		else {
			this.setPowerColor( "#fff" );
			this.setCoreColor( "#000" );
		}
	};

	jaby.toggleOnOff = function toggleOnOff() {
		if ( this.on ) {
			this.turnOff();
		}
		else {
			this.turnOn();
		}
	};

	jaby.turnOn = function turnOn() {
		this.turnOnPolling();
		this.turnOnAnimation();

		this.on = true;
		this.connected = true;

		this.setOrbColor();
		this.raiseOrb();
	};

	jaby.turnOff = function turnOff() {
		this.turnOffPolling();

		this.on = false;
		this.connected = true;

		this.setOrbColor();
		this.raiseOrb();
	};

	jaby.setOnline = function setOnline() {
		this.online = true;
		this.setOrbColor();
	};

	jaby.clearOnline = function clearOnline() {
		this.online = false;
		this.setOrbColor();
	};

	jaby.setOffline = function setOffline() {
		this.clearOnline();
	};

	jaby.setError = function setError() {
		this.error = true;
		this.setOrbColor();
	};

	jaby.clearError = function clearError() {
		this.error = false;
		this.setOrbColor();
	};

	jaby.setWarning = function setWarning() {
		this.warning = true;
		this.setOrbColor();
	};

	jaby.clearWarning = function clearWarning() {
		this.warning = false;
		this.setOrbColor();
	};

	jaby.setNotification = function setNotification() {
		this.notification = true;
		this.setOrbColor();
	};

	jaby.clearNotification = function clearNotification() {
		this.notification = false;
		this.setOrbColor();
	};

	jaby.initialize = function initialize() {
		this.setupDOM();
		this.setupEvents();

		this.setupCommuniqué();

		this.raised = 0;
		this.raiseOrb();

		this.online = false;
		this.error = false;
		this.warning = false;

		this.turnOff();

		this.setupSocketIO();
	};

	jaby.status = function status() {

		function doStatus() {
			var diffTime;

			context.dateTime = new Date();
			context.ttl = context.dateTime.getTime() + 10000;

			if ( !self.lastStatus ) {
				self.lastStatus = context.dateTime;
			}

			diffTime = context.dateTime - self.lastStatus;

			if ( self.lastStatus ) {
				if ( diffTime > self.waitStatusBeforeOffline ) {
					self.setOffline();
				}
				else {
					if ( diffTime > self.waitStatusBeforeWarning ) {
						self.setWarning();
					}
				}
			}

			self.socket.emit( "status", context );
		}

		var self = this;
		var context = {};

		if ( "geolocation" in navigator ) {
			navigator.geolocation.getCurrentPosition( function ( position ) {
				context.position = position;

				doStatus();
			}, function ( /* err */) {
				doStatus();
			}, {
				maximumAge: Infinity,
				timeout: 500
			} );
		}
		else {
			doStatus();
		}
	};

	jaby.removeExpiredMessages = function removeExpiredMessages() {
		var wrapper = document.getElementsByClassName( "communiqué" )[ 0 ];
		var messages = wrapper.getElementsByTagName( "section" );
		var i;
		var numElements = messages.length;
		var message, expirationDate;
		var now = new Date();
		var id;

		for ( i = 0; i < numElements; i++ ) {
			message = messages[ i ];
			id = message.getAttribute( "id" );
			if ( id ) {
				expirationDate = message.getAttribute( "data-expires" );
				if ( expirationDate && expirationDate < now ) {
					communiqué.remove( null, id );
				}
			}
		}
	};

	jaby.setForExpiration = function setForExpiration( message ) {
		var expires = new Date();
		expires.setSeconds( expires.getSeconds() + 10 );

		if ( message ) {
			message.dataset.expires = expires;
		}
	};

	jaby.insertMessage = function insertMessage( contents, id ) {
		communiqué.add( contents, null, id );
	};

	jaby.askQuestion = function askQuestion( id, question, answers ) {

		function createQuestion() {

			function answerFunction( question, answer ) {
				return function () {
					self.sendAnswer( question, answer );
					return false;
				};
			}

			var qa = document.createElement( "div" );
			var questionElement = document.createElement( "p" );
			var questionTextNode = document.createTextNode( question );
			var buttonElement, buttonText;
			var answersElement = document.createElement( "div" );
			var i, numAnswers, answer, answerFunc;

			questionElement.appendChild( questionTextNode );
			qa.appendChild( questionElement );

			answersElement.setAttribute( "class", "answers" );

			numAnswers = answers.length;
			for ( i = 0; i < numAnswers; i++ ) {
				answer = answers[ i ];
				answerFunc = answerFunction( id, answer.text );
				buttonElement = document.createElement( "a" );
				buttonElement.addEventListener( "click", answerFunc, false );
				buttonElement.setAttribute( "class", "btn" );
				buttonText = document.createTextNode( answer.text );
				buttonElement.appendChild( buttonText );
				answersElement.appendChild( buttonElement );
			}

			qa.appendChild( answersElement );

			self.insertMessage( qa, id );
		}

		var self = this;

		if ( id && !document.getElementById( id ) ) {
			createQuestion();
		}

	};

	jaby.setActivityLoad = function setActivityLoad( usage ) {
		var rateGoal = 5;
		var load = usage && usage.hasOwnProperty( "cpu" ) ? parseFloat( usage.cpu ) : undefined;

		if ( load !== undefined && typeof load === "number" ) {
			rateGoal = Math.round( load / 10 );

			if ( rateGoal < 1 ) {
				rateGoal = 1;
			}
			else {
				if ( rateGoal >= 10 ) {
					rateGoal = 10;
				}
			}
		}

		this.pulse.rateGoal = rateGoal;
	};

	jaby.setStatus = function setStatus( status ) {
		var date = new Date();
		var current_hour = date.getHours();

		if ( current_hour > 19 || current_hour < 5 ) {
			document.body.classList.remove( "twilight" );
			document.body.classList.add( "night" );
		}
		else {
			document.body.classList.remove( "night" );

			if ( current_hour > 17 || current_hour < 4 ) {
				document.body.classList.add( "twilight" );
			}
			else {
				document.body.classList.remove( "twilight" );
			}
		}

		if ( status === "online" ) {
			this.setOnline();
			this.clearWarning();
			this.clearError();
		}
		else {
			if ( status === "offline" ) {
				this.setOffline();
			}
			else {
				this.turnOff();
			}
		}
	};

	jaby.doHome = function doHome() {
		communiqué.next();
	};

	jaby.doEnd = function doEnd() {
		communiqué.prev();
	};

	jaby.doRight = function doRight() {
		var thisMessage = communiqué.getCurrentMessage();
		var id = thisMessage.getAttribute( "id" );
		var index = communiqué.getIndex();
		var indexToRemove;

		if ( id ) {
			this.setForExpiration( thisMessage );
		}
		else {
			indexToRemove = index;
			thisMessage.setAttribute( "data-remove", indexToRemove.toString() );
		}

		communiqué.next();
	};

	jaby.doLeft = function doLeft() {
		var previousMessage = communiqué.getPreviousMessage();
		if ( previousMessage ) {
			if ( !previousMessage.hasAttribute( "data-remove" ) ) {
				communiqué.prev();
			}
		}
	};

	jaby.doUp = function doUp() {
		// communiqué.up();
	};

	jaby.doDown = function doDown() {
		// communiqué.down();
	};

	jaby.doEnter = function doEnter() {
		this.doRight();
	};

	jaby.doCancel = function doCancel() {
		this.doRight();
	};

	jaby.userRequest = function userRequest() {
		var data = {
			message: "Testing"
		};

		if ( this.connected ) {
			this.socket.emit( "message", data );
		}
	};

	jaby.sendAnswer = function sendAnswer( question, answer ) {
		var envelope = {};

		if ( question && answer && this.connected ) {
			envelope.question = question;
			envelope.answer = answer;

			this.socket.emit( "answer", envelope );
		}
		communiqué.remove( null, question );
	};

	jaby.setupDOM = function setupDOM() {
		var orbComputed;
		var height;
		var sphereHeight;

		this.orb = document.getElementById( "orb" );
		this.rotated_sphere = document.getElementById( "sphere_holes" );
		this.inner_core = document.getElementById( "inner_core" );
		this.inner_power = document.getElementById( "inner_power" );
		this.shadow = document.getElementById( "sphere_shadow" );
		this.sphere = document.getElementById( "jaby_sphere" );
		this.stops = document.getElementsByClassName( "core_color" );
		this.sphere_shine = document.getElementById( "sphere_shine" );
		this.core_radius = parseInt( this.inner_core.getAttribute( "r" ), 10 );

		this.shadowRadiusY = parseFloat( this.shadow.getAttribute( "ry" ) );
		this.shadowRadiusX = parseFloat( this.shadow.getAttribute( "rx" ) );

		orbComputed = window.getComputedStyle( this.orb, null );
		height = parseFloat( orbComputed.getPropertyValue( "height" ) );
		sphereHeight = parseFloat( orbComputed.getPropertyValue( "width" ) );

		this.raisedHeight = height - sphereHeight - this.shadowRadiusY;
	};

	jaby.setupEvents = function setupEvents() {
		var self = this;

		visibly.onVisible( function () {
			self.turnOn.call( self );
		} );

		visibly.onHidden( function () {
			self.turnOff.call( self );
		} );

		visibly.onVisible( function () {
			self.turnOn.call( self );
		} );

		visibly.onHidden( function () {
			self.turnOff.call( self );
		} );

		this.sphere_shine.addEventListener( "click", function () {
			self.userRequest.call( self );
		} );
	};

	jaby.setupCommuniqué = function setupCommuniqué() {
		var self = this;

		communiqué.initialize( {
			width: "100%",
			height: "100%",
			margin: 0.1,
			minscale: 0.2,
			maxScale: 1.0,

			keyboard: {
				//	Return
				13: self.doEnter.bind( self ),

				//	Page Down
				34: self.doRight.bind( self ),

				//	Page Up
				33: self.doLeft.bind( self ),

				//	Left
				37: self.doLeft.bind( self ),

				//	Right
				39: self.doRight.bind( self ),

				//	Up
				38: self.doUp.bind( self ),

				//	Down
				40: self.doDown.bind( self ),

				//	Home
				36: self.doHome.bind( self ),

				//	End
				35: self.doEnd.bind( self ),

				//	Space
				32: self.doRight.bind( self ),

				//	ESC
				27: self.doCancel.bind( self )
			}

		} );

		communiqué.addEventListener( "ready", function ( /* event */) {

			communiqué.idExists = function ( id ) {
				var target;
				var wrapper = document.querySelector( ".communiqué" );

				if ( id ) {
					target = wrapper.querySelectorAll( ".messages > #" + id )[ 0 ];
				}

				return target !== undefined;
			};

		} );

		communiqué.addEventListener( "messagechanged", function ( event ) {
			var previousMessage = event.previousMessage;
			var removeMessage;

			if ( previousMessage ) {
				removeMessage = previousMessage.getAttribute( "data-remove" );
				if ( removeMessage !== undefined && removeMessage !== null ) {
					removeMessage = parseInt( removeMessage, 10 );
					setTimeout( function () {
						communiqué.remove( removeMessage );
					}, 1000 );
				}
			}
		} );

	};

	jaby.setupSocketIO = function setupSocketIO() {
		var self = this;

		this.socket = io();

		this.socket.on( "connect", function () {
			self.turnOn.apply( self );
		} );

		this.socket.on( "disconnect", function () {
			self.turnOff.apply( self );
		} );

		this.socket.on( "status", function ( status ) {
			self.onStatus.call( self, status );
		} );

		this.socket.on( "question", function ( qa ) {
			self.askQuestion.call( self, qa.id, qa.question, qa.answers );
		} );

		this.socket.emit( "start" );
	};

	if ( typeof module !== "undefined" && module.exports ) {
		module.exports = jaby;
	}
	if ( window ) {
		window[ exportName ] = jaby;
	}

} )( window, document, "jabyObj" );
