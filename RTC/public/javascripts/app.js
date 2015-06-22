(function(){
	var app = angular.module('projectRtc', [],
		function($locationProvider){$locationProvider.html5Mode(true);}
    );
	var client = new PeerManager();
	var mediaConfig = {
        audio:true,
        video: {
			mandatory: {},
			optional: []
        }
    };

    app.factory('camera', ['$rootScope', '$window', function($rootScope, $window){
    	var camera = {};
    	camera.preview = $window.document.getElementById('localVideo');

    	camera.start = function(){
			return requestUserMedia(mediaConfig)
			.then(function(stream){			
				attachMediaStream(camera.preview, stream);
				client.setLocalStream(stream);
				camera.stream = stream;
				$rootScope.$broadcast('cameraIsOn',true);
			})
			.catch(Error('Failed to get access to local media.'));
		};
    	camera.stop = function(){
    		return new Promise(function(resolve, reject){			
				try {
					camera.stream.stop();
					camera.preview.src = '';
					resolve();
				} catch(error) {
					reject(error);
				}
    		})
    		.then(function(result){
    			$rootScope.$broadcast('cameraIsOn',false);
    		});	
		};
		return camera;
    }]);

	app.controller('RemoteStreamsController', ['camera', '$location', '$http', '$rootScope', function(camera, $location, $http, $rootScope){
		var rtc = this;
		rtc.remoteStreams = [];
		function getStreamById(id) {
		    for(var i=0; i<rtc.remoteStreams.length;i++) {
		    	if (rtc.remoteStreams[i].id === id) {return rtc.remoteStreams[i];}
		    }
		}
		rtc.loadData = function () {
			// get list of streams from the server
			$http.get('/streams.json').success(function(data){
				// filter own stream
				var streams = data.filter(function(stream) {
			      	return stream.id != client.getId();
			    });
			    // get former state
			    for(var i=0; i<streams.length;i++) {
			    	var stream = getStreamById(streams[i].id);
			    	streams[i].isPlaying = (!!stream) ? stream.isPLaying : false;
			    }
			    // save new streams
			    rtc.remoteStreams = streams;
			});
		};

		rtc.view = function(stream){
			client.peerInit(stream.id);
			stream.isPlaying = !stream.isPlaying;
		};
		rtc.call = function(stream){
			/* If json isn't loaded yet, construct a new stream 
			 * This happens when you load <serverUrl>/<socketId> : 
			 * it calls socketId immediatly.
			**/
			if(!stream.id){
				stream = {id: stream, isPlaying: false};
				rtc.remoteStreams.push(stream);
			}
			if(camera.isOn){
				client.toggleLocalStream(stream.id);
				if(stream.isPlaying){
					client.peerRenegociate(stream.id);
				} else {
					client.peerInit(stream.id);
				}
				stream.isPlaying = !stream.isPlaying;
			} else {
				camera.start()
				.then(function(result) {
					client.toggleLocalStream(stream.id);
					if(stream.isPlaying){
						client.peerRenegociate(stream.id);
					} else {
						client.peerInit(stream.id);
					}
					stream.isPlaying = !stream.isPlaying;
				})
				.catch(function(err) {
					console.log(err);
				});
			}
		};
		
		//initial load
		rtc.loadData();
    	if($location.url() != '/'){
			console.log("Calling location " + $location.url().slice(1));
      		rtc.call($location.url().slice(1));
    	};
		

		$rootScope.$on('startVideoCall', function(event, url) {
			console.log("Starting video call to url = " + url + " id = " + url.split("/")[3]);
      		rtc.call(url.split("/")[3]);
		});
		
	}]);

	
	var rtcStreamLink = 0;
	
	app.controller('LocalStreamController',['camera', '$scope', '$window', function(camera, $scope, $window){
		var localStream = this;
		localStream.name = 'Controller';
		localStream.link = '';
		localStream.cameraIsOn = false;

		$scope.$on('cameraIsOn', function(event,data) {
    		$scope.$apply(function() {
		    	localStream.cameraIsOn = data;
		    });
		});

		localStream.toggleCam = function(){
			if(localStream.cameraIsOn){
				camera.stop()
				.then(function(result){
					client.send('leave');
	    			client.setLocalStream(null);
				})
				.catch(function(err) {
					console.log(err);
				});
			} else {
				camera.start()
				.then(function(result) {
					localStream.link = $window.location.host + '/' + client.getId();
					rtcStreamLink = localStream.link;
					$scope.$apply();
					client.send('readyToStream', { name: localStream.name });
				})
				.catch(function(err) {
					console.log(err);
				});
			}
		};
	}]);
	
	app.controller('RobotController', function($rootScope, $scope, $window) {
		var rc = this;
		rc.firebaseRef = {};
		rc.firebaseUsersRef = {};
		rc.users = [];
		rc.currentRobot = 0;
		rc.message_log = [];
		rc.signalStrength = 0;

		rc.connectToRobot = function(robot){
			rc.currentRobot = robot;
			
			rc.firebaseUsersRef.child(rc.currentRobot + "/robot_response").set("");
			rc.firebaseUsersRef.child(rc.currentRobot + "/rtsp_stream_url").set("");
			rc.firebaseUsersRef.child(rc.currentRobot + "/signal").set("");

			rc.firebaseUsersRef.child(rc.currentRobot).on("child_changed", function(snapshot) {
				var field = snapshot.key();
				var robot_response = snapshot.val();
				if (field === "robot_response") {
					if (robot_response === "CONNECTION_OK") {
						rc.firebaseUsersRef.child(rc.currentRobot + "/robot_response").set("");
						rc.firebaseUsersRef.child(rc.currentRobot + "/server_request").set("");
						console.log("Successfully connected to id = " + rc.currentRobot);
					}
					if (robot_response === "MOVEMENT_OK") {
						rc.firebaseUsersRef.child(rc.currentRobot + "/robot_response").set("");
						rc.firebaseUsersRef.child(rc.currentRobot + "/server_request").set("");
						console.log("Successfully performed movement");
					}
					if (robot_response === "GET_DATA_OK") {
						rc.firebaseUsersRef.child(rc.currentRobot + "/robot_response").set("");
						console.log("Successfully received custom command");
					}
				}
				if (field === "rtsp_stream_url") {
					if (robot_response !== "") {
						console.log("Emitting event to start video call to url = " + robot_response);
						rc.firebaseUsersRef.child(rc.currentRobot + "/rtsp_stream_url").set("");
						$rootScope.$emit('startVideoCall', robot_response);
						
						//rtsp_stream_start(robot_response);
						//rc.firebaseUsersRef.child(rc.currentRobot + "/rtsp_stream_url").set("");
					}
				}
				if (field === "bluetooth") {
					rc.message_log[rc.message_log.length] = robot_response + "\n";
					console.log("Received bluetooth signal " + rc.message_log[rc.message_log.length - 1]);
					var list_to_string = "";
					for (var i in rc.message_log) {
						list_to_string += rc.message_log[rc.message_log.length - 1 - i];
					}
					$scope.robot_log = list_to_string;
					$scope.$apply();
				}
				if (field === "signal" || field === "Signal") {
					console.log("Received WiFi strength signal = " + robot_response);
					rc.signalStrength = robot_response;
					if (rc.signalStrength == 1 || rc.signalStrength == 2) {
						console.log("Bad signal, sending RETURN_TO_BASE command!");
						rc.moveRobot('RETURN_TO_BASE');
					}
					$scope.$apply();
				}
			});

			rc.firebaseUsersRef.child(rc.currentRobot + "/server_request").set("ISSUE_CONNECTION");
			rc.firebaseUsersRef.child(rc.currentRobot + "/host_ip").set($window.location.host);
			
			console.log("Connected to: " + rc.currentRobot);	
		}
		
		rc.databaseRetrieveUsers = function(users_ref){
			users_ref.once("value", function(snapshot) {

				rc.users.length = 0;
				for (var key in snapshot.val()) {
					console.log(key);
					rc.users[rc.users.length] = key;
					rc.firebaseUsersRef.child(key + "/server_request").set("");
				}
				
				$scope.robot_list = rc.users;
				$scope.$apply();
				
			});
		};
		
		rc.connectToFirebase = function(addr){
			console.log("Firebase addr = " + addr);
			rc.firebaseRef = new Firebase(addr);
			
			function authHandler(error, authData) {
				if (error) {
					console.log("Login Failed!", error);
				} else {
					console.log("Authenticated successfully with payload:", authData);
				}
			}

			rc.firebaseRef.authWithPassword({
			  email    : 'tele-care@gmail.com',
			  password : '12345678'
			}, authHandler);
			
			rc.firebaseRef.child("host_ip").set($window.location.host);
			rc.firebaseUsersRef = rc.firebaseRef.child("users");
			rc.databaseRetrieveUsers(rc.firebaseUsersRef);
		};
		
		rc.moveRobot = function(dir){
			rc.firebaseUsersRef.child(rc.currentRobot + "/server_request").set(dir);
		};
		
		rc.sendCommand = function(chr, cmd1, cmd2, cmd3) {
			console.log("Sending command = " + chr + " " + cmd1 + " " + cmd2 + " " + cmd3);
			rc.firebaseUsersRef.child(rc.currentRobot + "/char").set(chr);
			rc.firebaseUsersRef.child(rc.currentRobot + "/number1").set(cmd1);
			rc.firebaseUsersRef.child(rc.currentRobot + "/number2").set(cmd2);
			rc.firebaseUsersRef.child(rc.currentRobot + "/number3").set(cmd3);
			rc.firebaseUsersRef.child(rc.currentRobot + "/server_request").set("GET_DATA");
		};
		
		
		rc.sendVideoRequest = function(){
			//rc.firebaseUsersRef.child(rc.currentRobot + "/rtsp_stream_url").set(rtcStreamLink);
			//console.log("Stream link = " + rtcStreamLink);
		}
		
		rc.stopVideoRequest = function(){
			//rc.firebaseUsersRef.child(rc.currentRobot + "/rtsp_stream_url").set("");
		}
	});
	
	
})();
