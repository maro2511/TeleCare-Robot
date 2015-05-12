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

	app.controller('RemoteStreamsController', ['camera', '$location', '$http', '$scope', function(camera, $location, $http, $scope){
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
		
		$scope.$on('startVideoCall', function(event, url) {
			console.log("Starting video call to id = " + url.split("/")[1]);
      		rtc.call(url.split("/")[1]);
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
	
	app.controller('RobotController', function($scope, $window) {
		var rc = this;
		rc.firebaseRef = {};
		rc.firabaseUsersRef = {};
		rc.users = [];
		rc.currentRobot = 0;

		rc.connectToRobot = function(robot){
			rc.currentRobot = robot;
			
			rc.firabaseUsersRef.child(rc.currentRobot + "/robot_response").set("");
			rc.firabaseUsersRef.child(rc.currentRobot + "/rtsp_stream_url").set("");

			rc.firabaseUsersRef.child(rc.currentRobot).on("child_changed", function(snapshot) {
				var field = snapshot.key();
				var robot_response = snapshot.val();
				if (field === "robot_response") {
					if (robot_response === "CONNECTION_OK") {
						rc.firabaseUsersRef.child(rc.currentRobot + "/robot_response").set("");
						console.log("Successfully connected to id = " + rc.currentRobot);
					}
					if (robot_response === "MOVEMENT_OK") {
						rc.firabaseUsersRef.child(rc.currentRobot + "/robot_response").set("");
						console.log("Successfully performed movement");
					}
				}
				if (field === "rtsp_stream_url") {
					if (robot_response !== "") {
						console.log("Emitting event to start video call to url = " + robot_response);
						rc.firabaseUsersRef.child(rc.currentRobot + "/rtsp_stream_url").set("");
						$scope.$emit('startVideoCall', robot_response);
						//rtsp_stream_start(robot_response);
						//rc.firabaseUsersRef.child(rc.currentRobot + "/rtsp_stream_url").set("");
					}
				}
			});

			rc.firabaseUsersRef.child(rc.currentRobot + "/server_request").set("ISSUE_CONNECTION");
			rc.firabaseUsersRef.child(rc.currentRobot + "/host_ip").set($window.location.host);
			
			console.log("Connected to: " + rc.currentRobot);	
		}
		
		rc.databaseRetrieveUsers = function(users_ref){
			users_ref.once("value", function(snapshot) {

				for (var key in snapshot.val()) {
					console.log(key);
					rc.users[rc.users.length] = key;
				}
				$scope.$apply();
				
			});
		};
		
		rc.connectToFirebase = function(addr){
			console.log("Firebase addr = " + addr);
			rc.firebaseRef = new Firebase(addr);
			rc.firabaseUsersRef = rc.firebaseRef.child("users");
			rc.databaseRetrieveUsers(rc.firabaseUsersRef);
		};
		
		rc.moveRobot = function(dir){
			rc.firabaseUsersRef.child(rc.currentRobot + "/server_request").set(dir);
		};
		
		rc.sendVideoRequest = function(){
			//rc.firabaseUsersRef.child(rc.currentRobot + "/rtsp_stream_url").set(rtcStreamLink);
			//console.log("Stream link = " + rtcStreamLink);
		}
		
		rc.stopVideoRequest = function(){
			//rc.firabaseUsersRef.child(rc.currentRobot + "/rtsp_stream_url").set("");
		}
	});
	
	
})();
