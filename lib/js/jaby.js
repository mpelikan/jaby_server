/* jshint browser:true, devel:true */
/* global io, visibly */
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
		pulseMax: 15,
		pulseDirection: 1,
		pulse: 0
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
			// console.info( data.timeZoneName ? data.timeZoneName : "no timezone data" );
		}
	};

	jaby.pulseCore = function pulseCore() {
		this.pulse = this.pulse + this.pulseDirection;
		this.inner_core.setAttribute( "r", this.core_radius + this.pulse );
		this.inner_power.setAttribute( "r", this.core_radius + this.pulse );

		if ( this.pulse >= this.pulseMax || this.pulse <= 0 ) {
			this.pulseDirection *= -1;
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

		self.status();

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
			} );
		}
		else {
			doStatus();
		}
	};

	jaby.insertMessageSlide = function insertMessageSlide( innerHTML ) {
		var newSlide = document.createElement( "section" );
		newSlide.innerHTML = innerHTML;

		this.slides.insertBefore( newSlide, this.slideEnd );
	};

	jaby.setStatus = function setStatus( status ) {
		var date = new Date();
		var current_hour = date.getHours();

		if ( current_hour > 20 || current_hour < 5 ) {
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

		// this.insertMessageSlide( status );
	};

	jaby.sendMessage = function sendMessage( message ) {
		var envelope = {};
		var context = {};

		if ( message && this.connected ) {
			envelope.context = context;
			envelope.message = message;

			this.socket.emit( "message", envelope );
		}
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
		this.core_radius = parseInt( this.inner_core.getAttribute( "r" ), 10 );

		this.shadowRadiusY = parseFloat( this.shadow.getAttribute( "ry" ) );
		this.shadowRadiusX = parseFloat( this.shadow.getAttribute( "rx" ) );

		orbComputed = window.getComputedStyle( this.orb, null );
		height = parseFloat( orbComputed.getPropertyValue( "height" ) );
		sphereHeight = parseFloat( orbComputed.getPropertyValue( "width" ) );

		this.raisedHeight = height - sphereHeight - this.shadowRadiusY;

		this.slides = document.getElementsByClassName( "slides" )[ 0 ];
		this.slideEnd = document.getElementById( "slideEnd" );
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

		// this.socket.on( "reply", function ( reply ) {
		// 	self.showText.call( self, reply.message );
		// } );

		this.socket.on( "status", function ( status ) {
			self.onStatus.call( self, status );
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