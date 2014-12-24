/*!
 * communiqué.js
 * MIT licensed
 *
 * Copyright (C) 2014 Michael Pelikan, https://github.com/mpelikan/communiqué
 */
/* jshint browser:true, devel:true */
( function ( window, document, exportName ) {
	"use strict";

	var communiqué = ( function () {
		var MESSAGES_SELECTOR = ".communiqué .messages > section";

		//	Configurations defaults, can be overridden at initialization time
		var config = {

			//	The "normal" size of the presentation, aspect ratio will be preserved
			//	when the presentation is scaled to fit different resolutions
			width: 960,
			height: 700,

			//	Factor of the display size that should remain empty around the content
			margin: 0.1,

			//	Bounds for smallest/largest possible scale to apply to content
			minScale: 0.2,
			maxScale: 1.0,

			//	Enable keyboard shortcuts for navigation
			keyboard: true,

			//	Vertical centering of messages
			center: true,

			//	Enables touch navigation on devices with touch input
			touch: true,

			//	Change the presentation direction to be RTL
			rtl: false,

			//	Enable message navigation via mouse wheel
			mouseWheel: false,

			//	Hides the address bar on mobile devices
			hideAddressBar: true,

			//	Focuses body when page changes visibility to ensure keyboard shortcuts work
			focusBodyOnPageVisiblityChange: true,

			//	Number of messages away from the current that are visible
			viewDistance: 3

		};

		//	Flags if communiqué.js is loaded (has dispatched the "ready" event)
		var loaded = false;

		//	The currently active message
		var index;

		//	The previous and current message HTML elements
		var previousMessage;
		var currentMessage;

		var previousBackground;

		//	Messages may hold a data-state attribute which we pick up and apply
		//	as a class to the body. This list contains the combined state of
		//	all current messages.
		var state = [];

		//	The current scale of the presentation (see width/height config)
		var scale = 1;

		//	Cached references to DOM elements
		var dom = {};

		//	Features supported by the browser, see #checkCapabilities()
		var features = {};

		//	Client is a mobile device, see #checkCapabilities()
		var isMobileDevice;

		//	Throttles mouse wheel navigation
		var lastMouseWheelStep = 0;

		//	Flags if the interaction event listeners are bound
		var eventsAreBound = false;

		//	Holds information about the currently ongoing touch input
		var touch = {
			startX: 0,
			startY: 0,
			startSpan: 0,
			startCount: 0,
			captured: false,
			threshold: 40
		};

		/**
		 * Starts up the presentation if the client is capable.
		 */
		function initialize( options ) {

			checkCapabilities();

			if ( !features.transforms2d && !features.transforms3d ) {
				document.body.setAttribute( "class", "no-transforms" );

				//	If the browser doesn't support core features we won't be
				//	using JavaScript to control the presentation
				return;
			}

			//	Force a layout when the whole page, incl fonts, has loaded
			window.addEventListener( "load", layout, false );

			//	Copy options over to our config object
			extend( config, options );

			//	Hide the address bar in mobile browsers
			hideAddressBar();

			start();

		}

		/**
		 * Inspect the client to see what it's capable of, this
		 * should only happens once per runtime.
		 */
		function checkCapabilities() {

			features.transforms3d = "WebkitPerspective" in document.body.style ||
				"MozPerspective" in document.body.style ||
				"msPerspective" in document.body.style ||
				"OPerspective" in document.body.style ||
				"perspective" in document.body.style;

			features.transforms2d = "WebkitTransform" in document.body.style ||
				"MozTransform" in document.body.style ||
				"msTransform" in document.body.style ||
				"OTransform" in document.body.style ||
				"transform" in document.body.style;

			features.requestAnimationFrameMethod = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
			features.requestAnimationFrame = typeof features.requestAnimationFrameMethod === "function";

			features.canvas = !!document.createElement( "canvas" ).getContext;

			isMobileDevice = navigator.userAgent.match( /(iphone|ipod|android)/gi );

		}

		/**
		 * Starts up communiqué.js by binding input events and navigating to first message.
		 */
		function start() {

			//	Make sure we've got all the DOM elements we need
			setupDOM();

			//	Updates the presentation to match the current configuration values
			configure();

			message( 0 );

			//	Update all backgrounds
			updateBackground();

			//	Notify listeners that the presentation is ready but use a 1ms
			//	timeout to ensure it's not fired synchronously after #initialize()
			setTimeout( function () {
				//	Enable transitions now that we're loaded
				dom.messages.classList.remove( "no-transition" );

				loaded = true;

				dispatchEvent( "ready", {
					"index": index,
					"currentMessage": currentMessage
				} );
			}, 1 );

		}

		/**
		 * Finds and stores references to DOM elements which are
		 * required by the presentation. If a required element is
		 * not found, it is created.
		 */
		function setupDOM() {

			//	Cache references to key DOM elements
			dom.theme = document.querySelector( "#theme" );
			dom.wrapper = document.querySelector( ".communiqué" );
			dom.messages = document.querySelector( ".communiqué .messages" );

			//	Prevent transitions while we're loading
			dom.messages.classList.add( "no-transition" );

			//	Background element
			dom.background = createSingletonNode( dom.wrapper, "div", "backgrounds", null );

			//	State background element [DEPRECATED]
			createSingletonNode( dom.wrapper, "div", "state-background", null );

		}

		/**
		 * Creates an HTML element and returns a reference to it.
		 * If the element already exists the existing instance will
		 * be returned.
		 */
		function createSingletonNode( container, tagname, classname, innerHTML ) {

			var node = container.querySelector( "." + classname );
			if ( !node ) {
				node = document.createElement( tagname );
				node.classList.add( classname );
				if ( innerHTML !== null ) {
					node.innerHTML = innerHTML;
				}
				container.appendChild( node );
			}
			return node;

		}

		/**
		 * Creates the message background elements and appends them
		 * to the background container. One element is created per
		 * message no matter if the given message has visible background.
		 */
		function createBackgrounds() {

			//	Clear prior backgrounds
			dom.background.innerHTML = "";
			dom.background.classList.add( "no-transition" );

			//	Helper method for creating a background element for the
			//	given message
			function _createBackground( message, container ) {

				var data = {
					background: message.getAttribute( "data-background" ),
					backgroundSize: message.getAttribute( "data-background-size" ),
					backgroundImage: message.getAttribute( "data-background-image" ),
					backgroundColor: message.getAttribute( "data-background-color" ),
					backgroundRepeat: message.getAttribute( "data-background-repeat" ),
					backgroundPosition: message.getAttribute( "data-background-position" ),
					backgroundTransition: message.getAttribute( "data-background-transition" )
				};

				var element = document.createElement( "div" );
				element.className = "message-background";

				if ( data.background ) {
					//	Auto-wrap image urls in url(...)
					if ( /^(http|file|\/\/)/gi.test( data.background ) || /\.(svg|png|jpg|jpeg|gif|bmp)$/gi.test( data.background ) ) {
						element.style.backgroundImage = "url(" + data.background + ")";
					}
					else {
						element.style.background = data.background;
					}
				}

				if ( data.background || data.backgroundColor || data.backgroundImage ) {
					element.setAttribute( "data-background-hash", data.background + data.backgroundSize + data.backgroundImage + data.backgroundColor + data.backgroundRepeat + data.backgroundPosition + data.backgroundTransition );
				}

				//	Additional and optional background properties
				if ( data.backgroundSize ) {
					element.style.backgroundSize = data.backgroundSize;
				}
				if ( data.backgroundImage ) {
					element.style.backgroundImage = "url(\"" + data.backgroundImage + "\")";
				}
				if ( data.backgroundColor ) {
					element.style.backgroundColor = data.backgroundColor;
				}
				if ( data.backgroundRepeat ) {
					element.style.backgroundRepeat = data.backgroundRepeat;
				}
				if ( data.backgroundPosition ) {
					element.style.backgroundPosition = data.backgroundPosition;
				}
				if ( data.backgroundTransition ) {
					element.setAttribute( "data-background-transition", data.backgroundTransition );
				}

				container.appendChild( element );

				return element;

			}

			//	Iterate over all messages
			toArray( document.querySelectorAll( MESSAGES_SELECTOR ) ).forEach( function ( messageIndex ) {

				_createBackground( messageIndex, dom.background );

			} );

			dom.background.style.backgroundImage = "";

		}

		/**
		 * Applies the configuration settings from the config object.
		 * May be called multiple times.
		 */
		function configure( options ) {

			dom.wrapper.classList.remove( "default" );

			//	New config options may be passed when this method is invoked through the API after initialization
			if ( typeof options === "object" ) {
				extend( config, options );
			}

			dom.wrapper.classList.add( "default" );

			dom.wrapper.setAttribute( "data-transition-speed", "default" );
			dom.wrapper.setAttribute( "data-background-transition", "default" );

			if ( config.rtl ) {
				dom.wrapper.classList.add( "rtl" );
			}
			else {
				dom.wrapper.classList.remove( "rtl" );
			}

			if ( config.center ) {
				dom.wrapper.classList.add( "center" );
			}
			else {
				dom.wrapper.classList.remove( "center" );
			}

			if ( config.mouseWheel ) {
				document.addEventListener( "DOMMouseScroll", onDocumentMouseScroll, false ); //	FF
				document.addEventListener( "mousewheel", onDocumentMouseScroll, false );
			}
			else {
				document.removeEventListener( "DOMMouseScroll", onDocumentMouseScroll, false ); //	FF
				document.removeEventListener( "mousewheel", onDocumentMouseScroll, false );
			}

			sync();

		}

		/**
		 * Binds all event listeners.
		 */
		function addEventListeners() {

			eventsAreBound = true;

			window.addEventListener( "resize", onWindowResize, false );

			if ( config.touch ) {
				dom.wrapper.addEventListener( "touchstart", onTouchStart, false );
				dom.wrapper.addEventListener( "touchmove", onTouchMove, false );
				dom.wrapper.addEventListener( "touchend", onTouchEnd, false );

				//	Support pointer-style touch interaction as well
				if ( window.navigator.msPointerEnabled ) {
					dom.wrapper.addEventListener( "MSPointerDown", onPointerDown, false );
					dom.wrapper.addEventListener( "MSPointerMove", onPointerMove, false );
					dom.wrapper.addEventListener( "MSPointerUp", onPointerUp, false );
				}
			}

			if ( config.keyboard ) {
				document.addEventListener( "keydown", onDocumentKeyDown, false );
			}

			if ( config.focusBodyOnPageVisiblityChange ) {
				var visibilityChange;

				if ( "hidden" in document ) {
					visibilityChange = "visibilitychange";
				}
				else if ( "msHidden" in document ) {
					visibilityChange = "msvisibilitychange";
				}
				else if ( "webkitHidden" in document ) {
					visibilityChange = "webkitvisibilitychange";
				}

				if ( visibilityChange ) {
					document.addEventListener( visibilityChange, onPageVisibilityChange, false );
				}
			}

		}

		/**
		 * Unbinds all event listeners.
		 */
		function removeEventListeners() {

			eventsAreBound = false;

			document.removeEventListener( "keydown", onDocumentKeyDown, false );
			window.removeEventListener( "resize", onWindowResize, false );

			dom.wrapper.removeEventListener( "touchstart", onTouchStart, false );
			dom.wrapper.removeEventListener( "touchmove", onTouchMove, false );
			dom.wrapper.removeEventListener( "touchend", onTouchEnd, false );

			if ( window.navigator.msPointerEnabled ) {
				dom.wrapper.removeEventListener( "MSPointerDown", onPointerDown, false );
				dom.wrapper.removeEventListener( "MSPointerMove", onPointerMove, false );
				dom.wrapper.removeEventListener( "MSPointerUp", onPointerUp, false );
			}

		}

		/**
		 * Extend object a with the properties of object b.
		 * If there's a conflict, object b takes precedence.
		 */
		function extend( a, b ) {
			var i;
			for ( i in b ) {
				if ( b.hasOwnProperty( i ) ) {
					a[ i ] = b[ i ];
				}
			}
		}

		/**
		 * Converts the target object to an array.
		 */
		function toArray( o ) {

			return Array.prototype.slice.call( o );

		}

		/**
		 * Measures the distance in pixels between point a
		 * and point b.
		 *
		 * @param {Object} a point with x/y properties
		 * @param {Object} b point with x/y properties
		 */
		function distanceBetween( a, b ) {

			var dx = a.x - b.x;
			var dy = a.y - b.y;

			return Math.sqrt( dx * dx + dy * dy );

		}

		/**
		 * Applies a CSS transform to the target element.
		 */
		function transformElement( element, transform ) {

			element.style.WebkitTransform = transform;
			element.style.MozTransform = transform;
			element.style.msTransform = transform;
			element.style.OTransform = transform;
			element.style.transform = transform;

		}

		/**
		 * Retrieves the height of the given element by looking at the position and height of its immediate children.
		 */
		function getAbsoluteHeight( element ) {

			var height = 0;

			if ( element ) {
				var absoluteChildren = 0;

				toArray( element.childNodes ).forEach( function ( child ) {

					if ( typeof child.offsetTop === "number" && child.style ) {
						//	Count # of abs children
						if ( child.style.position === "absolute" ) {
							absoluteChildren += 1;
						}

						height = Math.max( height, child.offsetTop + child.offsetHeight );
					}

				} );

				//	If there are no absolute children, use offsetHeight
				if ( absoluteChildren === 0 ) {
					height = element.offsetHeight;
				}

			}

			return height;

		}

		/**
		 * Returns the remaining height within the parent of the
		 * target element after subtracting the height of all
		 * siblings.
		 *
		 * remaining height = [parent height] - [ siblings height]
		 */
		function getRemainingHeight( element, height ) {

			height = height || 0;

			if ( element ) {
				var parent = element.parentNode;
				var siblings = parent.childNodes;

				//	Subtract the height of each sibling
				toArray( siblings ).forEach( function ( sibling ) {

					if ( typeof sibling.offsetHeight === "number" && sibling !== element ) {

						var styles = window.getComputedStyle( sibling ),
							marginTop = parseInt( styles.marginTop, 10 ),
							marginBottom = parseInt( styles.marginBottom, 10 );

						height -= sibling.offsetHeight + marginTop + marginBottom;

					}

				} );

				var elementStyles = window.getComputedStyle( element );

				//	Subtract the margins of the target element
				height -= parseInt( elementStyles.marginTop, 10 ) +
					parseInt( elementStyles.marginBottom, 10 );

			}

			return height;

		}

		/**
		 * Hides the address bar if we're on a mobile device.
		 */
		function hideAddressBar() {

			if ( config.hideAddressBar && isMobileDevice ) {
				//	Events that should trigger the address bar to hide
				window.addEventListener( "load", removeAddressBar, false );
				window.addEventListener( "orientationchange", removeAddressBar, false );
			}

		}

		/**
		 * Causes the address bar to hide on mobile devices, more vertical space ftw.
		 */
		function removeAddressBar() {

			setTimeout( function () {
				window.scrollTo( 0, 1 );
			}, 10 );

		}

		/**
		 * Dispatches an event of the specified type from the
		 * communiqué DOM element.
		 */
		function dispatchEvent( type, properties ) {

			var event = document.createEvent( "HTMLEvents", 1, 2 );
			event.initEvent( type, true, true );
			extend( event, properties );
			dom.wrapper.dispatchEvent( event );

		}

		/**
		 * Applies JavaScript-controlled layout rules to the presentation.
		 */
		function layout() {

			if ( dom.wrapper ) {

				//	Dimensions of the content
				var messageWidth = config.width;
				var messageHeight = config.height;
				var messagePadding = 20; //	TODO Dig this out of DOM

				//	Available space to scale within
				var availableWidth = dom.wrapper.offsetWidth;
				var availableHeight = dom.wrapper.offsetHeight;

				//	Reduce available space by margin
				availableWidth -= ( availableHeight * config.margin );
				availableHeight -= ( availableHeight * config.margin );

				//	Layout the contents of the messages
				layoutMessageContents( config.width, config.height, messagePadding );

				//	Message width may be a percentage of available width
				if ( typeof messageWidth === "string" && /%$/.test( messageWidth ) ) {
					messageWidth = parseInt( messageWidth, 10 ) / 100 * availableWidth;
				}

				//	Message height may be a percentage of available height
				if ( typeof messageHeight === "string" && /%$/.test( messageHeight ) ) {
					messageHeight = parseInt( messageHeight, 10 ) / 100 * availableHeight;
				}

				dom.messages.style.width = messageWidth + "px";
				dom.messages.style.height = messageHeight + "px";

				//	Determine scale of content to fit within available space
				scale = Math.min( availableWidth / messageWidth, availableHeight / messageHeight );

				//	Respect max/min scale settings
				scale = Math.max( scale, config.minScale );
				scale = Math.min( scale, config.maxScale );

				//	Prefer applying scale via zoom since Chrome blurs scaled content
				//	with nested transforms
				if ( typeof dom.messages.style.zoom !== "undefined" && !navigator.userAgent.match( /(iphone|ipod|ipad|android)/gi ) ) {
					dom.messages.style.zoom = scale;
				}
				//	Apply scale transform as a fallback
				else {
					transformElement( dom.messages, "translate(-50%, -50%) scale(" + scale + ") translate(50%, 50%)" );
				}

				//	Select all messages
				var messages = toArray( document.querySelectorAll( MESSAGES_SELECTOR ) );

				for ( var i = 0, len = messages.length; i < len; i++ ) {
					var message = messages[ i ];

					//	Don't bother updating invisible messages
					if ( message.style.display === "none" ) {
						continue;
					}

					if ( config.center || message.classList.contains( "center" ) ) {
						message.style.top = Math.max( -( getAbsoluteHeight( message ) / 2 ) - messagePadding, -messageHeight / 2 ) + "px";
					}
					else {
						message.style.top = "";
					}

				}

			}

		}

		/**
		 * Applies layout logic to the contents of all messages in the presentation.
		 */
		function layoutMessageContents( width, height, padding ) {

			//	Handle sizing of elements with the "stretch" class
			toArray( dom.messages.querySelectorAll( "section > .stretch" ) ).forEach( function ( element ) {

				//	Determine how much vertical space we can use
				var remainingHeight = getRemainingHeight( element, ( height - ( padding * 2 ) ) );

				//	Consider the aspect ratio of media elements
				if ( /(img|video)/gi.test( element.nodeName ) ) {
					var nw = element.naturalWidth || element.videoWidth,
						nh = element.naturalHeight || element.videoHeight;

					var es = Math.min( width / nw, remainingHeight / nh );

					element.style.width = ( nw * es ) + "px";
					element.style.height = ( nh * es ) + "px";

				}
				else {
					element.style.width = width + "px";
					element.style.height = remainingHeight + "px";
				}

			} );

		}

		/**
		 * Steps from the current point in the presentation to the
		 * message which matches the specified index.
		 *
		 * @param {int} i Index of the target message
		 */
		function message( i ) {
			var j, len, k;

			//	Query all messages in the deck
			var messages = document.querySelectorAll( MESSAGES_SELECTOR );

			//	Remember the state before this message
			var stateBefore = state.concat();

			//	Remember where we were at before
			previousMessage = currentMessage;

			var indexBefore = index || 0;

			//	Reset the state array
			state.length = 0;

			//	Activate and transition to the new message
			index = updateMessages( MESSAGES_SELECTOR, i === undefined ? index : i );

			//	Update the visibility of messages now that the indices have changed
			updateMessagesVisibility();

			layout();

			//	Apply the new state
			stateLoop:
				for ( j = 0, len = state.length; j < len; j++ ) {
					//	Check if this state existed on the previous message.
					//	If it did, we will avoid adding it repeatedly
					for ( k = 0; k < stateBefore.length; k++ ) {
						if ( stateBefore[ k ] === state[ j ] ) {
							stateBefore.splice( k, 1 );
							continue stateLoop;
						}
					}

					document.documentElement.classList.add( state[ j ] );

					//	Dispatch custom event matching the state's name
					dispatchEvent( state[ j ] );
				}

			//	Clean up the remains of the previous state
			while ( stateBefore.length ) {
				document.documentElement.classList.remove( stateBefore.pop() );
			}

			//	Store references to the previous and current messages
			currentMessage = messages[ index ];

			//	Dispatch an event if the message changed
			var messageChanged = ( index !== indexBefore );
			if ( messageChanged ) {
				dispatchEvent( "messagechanged", {
					"index": index,
					"previousMessage": previousMessage,
					"currentMessage": currentMessage
				} );
			}
			else {
				//	Ensure that the previous message is never the same as the current
				previousMessage = null;
			}

			//	Handle embedded content
			if ( messageChanged ) {
				stopEmbeddedContent( previousMessage );
				startEmbeddedContent( currentMessage );
			}

			updateBackground();

		}

		/**
		 * Syncs the presentation with the current DOM. Useful when new messages or control elements are added or when
		 * the configuration has changed.
		 */
		function sync() {

			//	Subscribe to input
			removeEventListeners();
			addEventListeners();

			//	Force a layout to make sure the current config is accounted for
			layout();

			//	Re-create the message backgrounds
			createBackgrounds();

			updateBackground( true );

			//	TODO: Either put in background or bring to forefront
			//activateCommuniqué();

		}

		/**
		 * Updates one dimension of messages by showing the message
		 * with the specified index.
		 *
		 * @param {String} selector A CSS selector that will fetch
		 * the group of messages we are working with
		 * @param {Number} index The index of the message that should be
		 * shown
		 *
		 * @return {Number} The index of the message that is now shown,
		 * might differ from the passed in index if it was out of
		 * bounds.
		 */
		function updateMessages( selector, index ) {

			//	Select all messages and convert the NodeList result to an array
			var messages = toArray( document.querySelectorAll( selector ) );
			var messagesLength = messages.length;

			if ( messagesLength ) {

				//	Enforce max and minimum index bounds
				index = Math.max( Math.min( index, messagesLength - 1 ), 0 );

				for ( var i = 0; i < messagesLength; i++ ) {
					var element = messages[ i ];

					var reverse = config.rtl;

					element.classList.remove( "past" );
					element.classList.remove( "present" );
					element.classList.remove( "future" );

					//	http://www.w3.org/html/wg/drafts/html/master/editing.html#the-hidden-attribute
					element.setAttribute( "hidden", "" );

					if ( i < index ) {
						//	Any element previous to index is given the "past" class
						element.classList.add( reverse ? "future" : "past" );
					}
					else if ( i > index ) {
						//	Any element subsequent to index is given the "future" class
						element.classList.add( reverse ? "past" : "future" );

						var futureFragments = toArray( element.querySelectorAll( ".fragment.visible" ) );

						//	No fragments in future messages should be visible ahead of time
						while ( futureFragments.length ) {
							var futureFragment = futureFragments.pop();
							futureFragment.classList.remove( "visible" );
							futureFragment.classList.remove( "current-fragment" );
						}
					}

				}

				//	Mark the current message as present
				messages[ index ].classList.add( "present" );
				messages[ index ].removeAttribute( "hidden" );

				//	If this message has a state associated with it, add it
				//	onto the current state of the deck
				var messageState = messages[ index ].getAttribute( "data-state" );
				if ( messageState ) {
					state = state.concat( messageState.split( " " ) );
				}

			}
			else {
				//	Since there are no messages we can't be anywhere beyond the
				//	zeroth index
				index = 0;
			}

			return index;

		}

		/**
		 * Optimization method; hide all messages that are far away
		 * from the present message.
		 */
		function updateMessagesVisibility() {

			//	Select all messages and convert the NodeList result to an array
			var viewDistance = 1;
			var messages = toArray( document.querySelectorAll( MESSAGES_SELECTOR ) );
			var messagesLength = messages.length;
			var distanceX;

			if ( messagesLength ) {

				for ( var x = 0; x < messagesLength; x++ ) {
					var message = messages[ x ];

					//	Loops so that it measures 1 between the first and last messages
					distanceX = Math.abs( ( index - x ) % ( messagesLength - viewDistance ) ) || 0;

					//	Show the message if it's within the view distance
					message.style.display = distanceX > viewDistance ? "none" : "block";

				}

			}

		}

		/**
		 * Updates the background elements to reflect the current message.
		 */
		function updateBackground() {
			var currentBackground = null;

			//	Reverse past/future classes when in RTL mode
			var messagePast = config.rtl ? "future" : "past";
			var messageFuture = config.rtl ? "past" : "future";

			//	Update the classes of all backgrounds to match the
			//	states of their messages (past/present/future)
			toArray( dom.background.childNodes ).forEach( function ( backgroundh, i ) {

				if ( i < index ) {
					backgroundh.className = "message-background " + messagePast;
				}
				else if ( i > index ) {
					backgroundh.className = "message-background " + messageFuture;
				}
				else {
					backgroundh.className = "message-background present";

					//	Store a reference to the current background element
					currentBackground = backgroundh;
				}

			} );

			//	Don't transition between identical backgrounds. This prevents unwanted flicker.
			if ( currentBackground ) {
				var previousBackgroundHash = previousBackground ? previousBackground.getAttribute( "data-background-hash" ) : null;
				var currentBackgroundHash = currentBackground.getAttribute( "data-background-hash" );
				if ( currentBackgroundHash && currentBackgroundHash === previousBackgroundHash && currentBackground !== previousBackground ) {
					dom.background.classList.add( "no-transition" );
				}

				previousBackground = currentBackground;
			}

			//	Allow the first background to apply without transition
			setTimeout( function () {
				dom.background.classList.remove( "no-transition" );
			}, 1 );

		}

		/**
		 * Determine what available routes there are for navigation.
		 *
		 * @return {Object} containing four booleans: left/right/up/down
		 */
		function availableRoutes() {

			var messages = document.querySelectorAll( MESSAGES_SELECTOR );

			var routes = {
				left: index > 0,
				right: index < messages.length - 1
			};

			//	Reverse controls for rtl
			if ( config.rtl ) {
				var left = routes.left;
				routes.left = routes.right;
				routes.right = left;
			}

			return routes;

		}

		/**
		 * Start playback of any embedded content inside of the targeted message.
		 */
		function startEmbeddedContent( message ) {

			if ( message ) {
				//	HTML5 media elements
				toArray( message.querySelectorAll( "video, audio" ) ).forEach( function ( el ) {
					if ( el.hasAttribute( "data-autoplay" ) ) {
						el.play();
					}
				} );

				//	iframe embeds
				toArray( message.querySelectorAll( "iframe" ) ).forEach( function ( el ) {
					el.contentWindow.postMessage( "message:start", "*" );
				} );

				//	YouTube embeds
				toArray( message.querySelectorAll( "iframe[src*=\"youtube.com/embed/\"]" ) ).forEach( function ( el ) {
					if ( el.hasAttribute( "data-autoplay" ) ) {
						el.contentWindow.postMessage( "{\"event\":\"command\",\"func\":\"playVideo\",\"args\":\"\"}", "*" );
					}
				} );
			}

		}

		/**
		 * Stop playback of any embedded content inside of
		 * the targeted message.
		 */
		function stopEmbeddedContent( message ) {

			if ( message ) {
				//	HTML5 media elements
				toArray( message.querySelectorAll( "video, audio" ) ).forEach( function ( el ) {
					if ( !el.hasAttribute( "data-ignore" ) ) {
						el.pause();
					}
				} );

				//	iframe embeds
				toArray( message.querySelectorAll( "iframe" ) ).forEach( function ( el ) {
					el.contentWindow.postMessage( "message:stop", "*" );
				} );

				//	YouTube embeds
				toArray( message.querySelectorAll( "iframe[src*=\"youtube.com/embed/\"]" ) ).forEach( function ( el ) {
					if ( !el.hasAttribute( "data-ignore" ) && typeof el.contentWindow.postMessage === "function" ) {
						el.contentWindow.postMessage( "{\"event\":\"command\",\"func\":\"pauseVideo\",\"args\":\"\"}", "*" );
					}
				} );
			}

		}

		/**
		 * Retrieves the index/location of the current, or specified, message.
		 *
		 * @param {HTMLElement} message If specified, the returned index will be for this message rather than the currently
		 * active one
		 *
		 * @return {int} index
		 */
		function getIndex( message ) {

			//	By default, return the current index
			var i = index;

			//	If a message is specified, return the index of that message
			if ( message ) {
				var messageIndex = message;

				//	Select all messages
				var messages = toArray( document.querySelectorAll( MESSAGES_SELECTOR ) );

				//	Now that we know which the message is, get its index
				i = Math.max( messages.indexOf( messageIndex ), 0 );

			}

			return i;

		}

		function navigateLeft() {

			//	Reverse for RTL
			if ( config.rtl ) {
				if ( availableRoutes().left ) {
					message( index + 1 );
				}
			}
			//	Normal navigation
			else {
				if ( availableRoutes().left ) {
					message( index - 1 );
				}
			}

		}

		function navigateRight() {

			//	Reverse for RTL
			if ( config.rtl ) {
				if ( availableRoutes().right ) {
					message( index - 1 );
				}
			}
			//	Normal navigation
			else {
				if ( availableRoutes().right ) {
					message( index + 1 );
				}
			}

		}

		/**
		 * Navigates backwards
		 */
		function navigatePrev() {

			//	Fetch the previous message, if there is one
			var previousMessage = document.querySelector( MESSAGES_SELECTOR + ".past:nth-child(" + index + ")" );
			var i;

			if ( previousMessage ) {
				i = index - 1;
				message( i );
			}

		}

		/**
		 * Same as #navigatePrev() but navigates forwards.
		 */
		function navigateNext() {

			navigateRight();

		}

		//	--------------------------------------------------------------------//
		//	----------------------------- EVENTS -------------------------------//
		//	--------------------------------------------------------------------//

		/**
		 * Called by all event handlers that are based on user input.
		 */
		function onUserInput( /* event */) {}

		/**
		 * Handler for the document level "keydown" event.
		 */
		function onDocumentKeyDown( event ) {

			var triggered = false;

			onUserInput( event );

			//	Check if there's a focused element that could be using the keyboard
			var activeElement = document.activeElement;
			var hasFocus = !!( activeElement && ( activeElement.type || activeElement.href || activeElement.contentEditable !== "inherit" ) );

			//	Disregard the event if there's a focused element or a keyboard modifier key is present
			if ( hasFocus || ( event.shiftKey && event.keyCode !== 32 ) || event.altKey || event.ctrlKey || event.metaKey ) {
				return;
			}

			//	1. User defined key bindings
			if ( typeof config.keyboard === "object" ) {

				for ( var key in config.keyboard ) {

					//	Check if this binding matches the pressed key
					if ( parseInt( key, 10 ) === event.keyCode ) {

						var value = config.keyboard[ key ];

						//	Callback function
						if ( typeof value === "function" ) {
							value.apply( null, [ event ] );
						}
						//	String shortcuts to communiqué.js API
						else if ( typeof value === "string" && typeof communiqué[ value ] === "function" ) {
							communiqué[ value ].call();
						}

						triggered = true;

					}

				}

			}

			//	2. System defined key bindings
			if ( triggered === false ) {

				//	Assume true and try to prove false
				triggered = true;

				switch ( event.keyCode ) {
					//	p, page up
					case 80:
					case 33:
						navigatePrev();
						break;
						//	n, page down
					case 78:
					case 34:
						navigateNext();
						break;
						//	h, left
					case 72:
					case 37:
						navigateLeft();
						break;
						//	l, right
					case 76:
					case 39:
						navigateRight();
						break;
						//	k, up
						//	case 75:
						//	case 38:
						//		navigateUp();
						//		break;
						//	j, down
						//	case 74:
						//	case 40:
						//		navigateDown();
						//		break;
						//	home
					case 36:
						message( 0 );
						break;
						//	end
					case 35:
						message( Number.MAX_VALUE );
						break;
						//	space
					case 32:
						if ( event.shiftKey ) {
							navigatePrev();
						}
						else {
							navigateNext();
						}
						break;
						//	return
					case 13:
						triggered = false;
						break;
					default:
						triggered = false;
				}

			}

			//	If the input resulted in a triggered action we should prevent the browsers default behavior
			if ( triggered ) {
				event.preventDefault();
			}
			//	ESC or O key
			else if ( ( event.keyCode === 27 || event.keyCode === 79 ) && features.transforms3d ) {
				event.preventDefault();
			}

		}

		/**
		 * Handler for the "touchstart" event, enables support for swipe and pinch gestures.
		 */
		function onTouchStart( event ) {

			touch.startX = event.touches[ 0 ].clientX;
			touch.startY = event.touches[ 0 ].clientY;
			touch.startCount = event.touches.length;

			//	If there's two touches we need to memorize the distance
			//	between those two points to detect pinching
			if ( event.touches.length === 2 && config.overview ) {
				touch.startSpan = distanceBetween( {
					x: event.touches[ 1 ].clientX,
					y: event.touches[ 1 ].clientY
				}, {
					x: touch.startX,
					y: touch.startY
				} );
			}

		}

		/**
		 * Handler for the "touchmove" event.
		 */
		function onTouchMove( event ) {

			//	Each touch should only trigger one action
			if ( !touch.captured ) {
				onUserInput( event );

				var currentX = event.touches[ 0 ].clientX;
				var currentY = event.touches[ 0 ].clientY;

				//	If the touch started with two points and still has
				//	two active touches; test for the pinch gesture
				if ( event.touches.length === 2 && touch.startCount === 2 && config.overview ) {

					//	The current distance in pixels between the two touch points
					var currentSpan = distanceBetween( {
						x: event.touches[ 1 ].clientX,
						y: event.touches[ 1 ].clientY
					}, {
						x: touch.startX,
						y: touch.startY
					} );

					//	If the span is larger than the desire amount we've got ourselves a pinch
					if ( Math.abs( touch.startSpan - currentSpan ) > touch.threshold ) {
						touch.captured = true;
					}

					event.preventDefault();

				}
				//	There was only one touch point, look for a swipe
				else if ( event.touches.length === 1 && touch.startCount !== 2 ) {

					var deltaX = currentX - touch.startX,
						deltaY = currentY - touch.startY;

					if ( deltaX > touch.threshold && Math.abs( deltaX ) > Math.abs( deltaY ) ) {
						touch.captured = true;
						navigateLeft();
					}
					else if ( deltaX < -touch.threshold && Math.abs( deltaX ) > Math.abs( deltaY ) ) {
						touch.captured = true;
						navigateRight();
					}
					else if ( deltaY > touch.threshold ) {
						touch.captured = true;
						//	navigateUp();
					}
					else if ( deltaY < -touch.threshold ) {
						touch.captured = true;
						//	navigateDown();
					}

					//	Block them all to avoid needless tossing around of the viewport in iOS
					event.preventDefault();

				}
			}

			//	There's a bug with swiping on some Android devices unless the default action is always prevented
			else if ( navigator.userAgent.match( /android/gi ) ) {
				event.preventDefault();
			}

		}

		/**
		 * Handler for the "touchend" event.
		 */
		function onTouchEnd( /* event */) {

			touch.captured = false;

		}

		/**
		 * Convert pointer down to touch start.
		 */
		function onPointerDown( event ) {

			if ( event.pointerType === event.MSPOINTER_TYPE_TOUCH ) {
				event.touches = [ {
					clientX: event.clientX,
					clientY: event.clientY
				} ];
				onTouchStart( event );
			}

		}

		/**
		 * Convert pointer move to touch move.
		 */
		function onPointerMove( event ) {

			if ( event.pointerType === event.MSPOINTER_TYPE_TOUCH ) {
				event.touches = [ {
					clientX: event.clientX,
					clientY: event.clientY
				} ];
				onTouchMove( event );
			}

		}

		/**
		 * Convert pointer up to touch end.
		 */
		function onPointerUp( event ) {

			if ( event.pointerType === event.MSPOINTER_TYPE_TOUCH ) {
				event.touches = [ {
					clientX: event.clientX,
					clientY: event.clientY
				} ];
				onTouchEnd( event );
			}

		}

		/**
		 * Handles mouse wheel scrolling, throttled to avoid skipping
		 * multiple messages.
		 */
		function onDocumentMouseScroll( event ) {

			if ( Date.now() - lastMouseWheelStep > 600 ) {

				lastMouseWheelStep = Date.now();

				var delta = event.detail || -event.wheelDelta;
				if ( delta > 0 ) {
					navigateNext();
				}
				else {
					navigatePrev();
				}

			}

		}

		/**
		 * Handler for the window level "resize" event.
		 */
		function onWindowResize( /* event */) {

			layout();

		}

		/**
		 * Handle for the window level "visibilitychange" event.
		 */
		function onPageVisibilityChange( /* event */) {

			var isHidden = document.webkitHidden || document.msHidden || document.hidden;

			//	If, after clicking a link or similar and we're coming back,
			//	focus the document.body to ensure we can use keyboard shortcuts
			if ( isHidden === false && document.activeElement !== document.body ) {
				document.activeElement.blur();
				document.body.focus();
			}

		}

		/**
		 * Returns true if we're currently on the last message
		 */
		function isLastMessage() {
			if ( currentMessage ) {
				//	Does this message has next a sibling?
				if ( currentMessage.nextElementSibling ) {
					return false;
				}

				return true;
			}

			return false;
		}

		function addMessage( content, index, id ) {
			var newMessage = document.createElement( "section" );

			if ( id ) {
				newMessage.setAttribute( "id", id );
			}

			content = content || "";
			index = ( index !== undefined && index !== null ) ? index : -1;

			dom.messages = document.querySelector( ".communiqué .messages" );

			if ( index === -1 ) {
				//	Adding message to end
				newMessage.classList.add( "future" );
				dom.messages.appendChild( newMessage );
			}
			else {
				if ( index > getIndex() ) {
					newMessage.classList.add( "future" );
					dom.messages.insertBefore( newMessage, dom.messages.querySelectorAll( "section:nth-child(" + ( index + 1 ) + ")" )[ 0 ] );
				}
				else {
					if ( index <= getIndex() ) {
						newMessage.classList.add( "past" );
						dom.messages.insertBefore( newMessage, dom.messages.querySelectorAll( "section:nth-child(" + ( index + 1 ) + ")" )[ 0 ] );
						navigateNext();
					}
				}
			}
			if ( typeof content === "object" && content instanceof HTMLElement ) {
				newMessage.appendChild( content );
			}
			else {
				newMessage.innerHTML = content;
			}

			sync();
		}

		function removeMessage( index, id ) {
			var targetSelector, targetElement, target;

			dom.wrapper = document.querySelector( ".communiqué" );
			dom.messages = document.querySelector( ".communiqué > .messages" );

			index = ( index !== undefined && index !== null ) ? index : -1;

			if ( id !== null && id !== undefined ) {
				targetSelector = ".messages > #" + id;
			}
			else {
				targetSelector = ".messages > section:nth-child(" + ( index + 1 ) + ")";
			}

			targetElement = dom.wrapper.querySelectorAll( targetSelector )[ 0 ];
			target = targetElement ? targetElement : false;

			if ( index === -1 ) {
				if ( isLastMessage() ) {
					navigatePrev();
				}
				dom.messages.removeChild( dom.wrapper.querySelectorAll( ".messages > section" )[ dom.wrapper.querySelectorAll( ".messages > section" ).length - 1 ] );
			}
			else {
				if ( index > getIndex() && target ) {
					dom.messages.removeChild( target );
				}
				else {
					if ( index < getIndex() && target ) {
						dom.messages.removeChild( target );
						message( getIndex() - 1 );
					}
					else {
						if ( index === getIndex() && target ) {
							if ( index === 0 ) {
								navigateNext();
							}
							else {
								navigatePrev();
							}
							dom.messages.removeChild( target );
						}
					}
				}
			}

			sync();
		}

		/**
		 * Returns the message at the specified index
		 */
		function getMessage( x ) {
			var message = document.querySelectorAll( MESSAGES_SELECTOR )[ x ];

			return message;
		}

		/**
		 * Returns the previous message element, may be null
		 */
		function getPreviousMessage() {
			return previousMessage;
		}

		/**
		 * Returns the current message element
		 */
		function getCurrentMessage() {
			return currentMessage;
		}

		/**
		 * Returns the current scale of the presentation content
		 */
		function getScale() {
			return scale;
		}

		/**
		 * Returns the current configuration object
		 */
		function getConfig() {
			return config;
		}

		/**
		 * Returns true if we're currently on the first message
		 */
		function isFirstMessage() {
			return document.querySelector( MESSAGES_SELECTOR + ".past" ) === null ? true : false;
		}

		/**
		 * Checks if communiqué.js has been loaded and is ready for use
		 */
		function isReady() {
			return loaded;
		}

		/**
		 * Forward event binding to the communiqué DOM element
		 */
		function addEventListener( type, listener, useCapture ) {
			if ( "addEventListener" in window ) {
				( dom.wrapper || document.querySelector( ".communiqué" ) ).addEventListener( type, listener, useCapture );
			}
		}

		function removeEventListener( type, listener, useCapture ) {
			if ( "addEventListener" in window ) {
				( dom.wrapper || document.querySelector( ".communiqué" ) ).removeEventListener( type, listener, useCapture );
			}
		}

		//	--------------------------------------------------------------------//
		//	------------------------------- API --------------------------------//
		//	--------------------------------------------------------------------//

		return {
			initialize: initialize,
			configure: configure,
			sync: sync,

			//	Navigation methods
			message: message,
			left: navigateLeft,
			right: navigateRight,
			//	up: navigateUp,
			//	down: navigateDown,
			prev: navigatePrev,
			next: navigateNext,

			//	Forces an update in message layout
			layout: layout,

			//	Returns an object with the available routes as booleans (left/right/top/bottom)
			availableRoutes: availableRoutes,

			//	Adds or removes all internal event listeners (such as keyboard)
			addEventListeners: addEventListeners,
			removeEventListeners: removeEventListeners,

			//	Returns the indices of the current, or specified, message
			getIndex: getIndex,

			add: addMessage,
			remove: removeMessage,

			getMessage: getMessage,
			getPreviousMessage: getPreviousMessage,
			getCurrentMessage: getCurrentMessage,

			getScale: getScale,

			getConfig: getConfig,

			isFirstMessage: isFirstMessage,
			isLastMessage: isLastMessage,

			isReady: isReady,

			addEventListener: addEventListener,
			removeEventListener: removeEventListener
		};
	} )();

	if ( typeof module !== "undefined" && module.exports ) {
		module.exports = communiqué;
	}
	if ( window ) {
		window[ exportName ] = communiqué;
	}

} )( window, document, "communiqué" );
