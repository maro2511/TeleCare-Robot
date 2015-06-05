
function database_connect(url) {

    console.log("Firebase addr = " + url);
    var ref = new Firebase(url);
    return ref;
}

function database_retrieve_users(users_ref) {

    // Attach an asynchronous callback to read the data at our posts reference
    users_ref.once("value", function(snapshot) {
        for (var key in snapshot.val()) {
            console.log(key);
            $("#robot_id_select").append(
                "<li role=\"presentation\"><a role=\"menuitem\" tabindex=\"-1\" href=\"#\" id=\"" +
                key +
                "\">" + key + "</a></li>");
        }
    });
}

function rtsp_stream_start(url) {

    console.log("Playing video stream from " + url);

    jwplayer("videoPlayer").setup({
        height: 480,
        width: 640,
        file: url,
        image: "",
        rtmp: {
            bufferlength: 3
        }
    });

    jwplayer("videoPlayer").play();
}

function database_connect_to_robot(ref, robot_id) {
    ref.child(robot_id + "/robot_response").set("");
    ref.child(robot_id + "/rtsp_stream_url").set("");

    ref.child(robot_id).on("child_changed", function(snapshot) {
        var field = snapshot.key();
        var robot_response = snapshot.val();
        if (field === "robot_response") {
            if (robot_response === "CONNECTION_OK") {
                ref.child(robot_id + "/robot_response").set("");
                console.log("Successfully connected to id = " + robot_id);
            }
            if (robot_response === "MOVEMENT_OK") {
                ref.child(robot_id + "/robot_response").set("");
                console.log("Successfully performed movement");
            }
        }
        if (field === "rtsp_stream_url") {
            rtsp_stream_start(robot_response);
            ref.child(robot_id + "/rtsp_stream_url").set("");
        }
    });

    ref.child(robot_id + "/server_request").set("ISSUE_CONNECTION");
}

$(document).ready(function(){

    // jQuery methods go here...

    // Get a reference to our posts
    var ref;
    var users_ref;

    $("#firebaseConnectButton").on("click", function (){

        ref = database_connect($("#server_addr").val());
        users_ref = ref.child("users");
        database_retrieve_users(users_ref);

    });

    var current_robot;

    $("#robot_id_select").on("click", "a", (function (){
        //TODO database_disconnect_from_robot(users_ref, current_robot);
        current_robot = $(this).text();
        $("#dropdownMenu1").text(current_robot);
        console.log("Robot with id = " + current_robot + " selected.");
        database_connect_to_robot(users_ref, current_robot);

    }));

    $("#startVideoButton").on("click", function (){
        users_ref.child(current_robot + "/server_request").set("START_VIDEO");
    });

    $("#stopVideoButton").on("click", function (){
        users_ref.child(current_robot + "/server_request").set("STOP_VIDEO");
        jwplayer("videoPlayer").stop();
    });


    $("#upDirectionButton").on("click", function (){
        users_ref.child(current_robot + "/server_request").set("GO_FORWARD");
    });
    $("#leftDirectionButton").on("click", function (){
        users_ref.child(current_robot + "/server_request").set("GO_LEFT");
    });
    $("#downDirectionButton").on("click", function (){
        users_ref.child(current_robot + "/server_request").set("GO_BACK");
    });
    $("#rightDirectionButton").on("click", function (){
        users_ref.child(current_robot + "/server_request").set("GO_RIGHT");
    });
    $("#returnToBaseButton").on("click", function (){
        users_ref.child(current_robot + "/server_request").set("RETURN_TO_BASE");
    });


    navigator.getUserMedia ||
    (navigator.getUserMedia = navigator.mozGetUserMedia ||
        navigator.webkitGetUserMedia || navigator.msGetUserMedia);

    if (navigator.getUserMedia) {
        navigator.getUserMedia({
            video: true,
            audio: true
        },
            function(stream) {
                //var video = document.getElementById('webcam');
                var videoSource;

                if (window.URL) {
                    videoSource = window.URL.createObjectURL(stream);
                } else {
                    videoSource = stream;
                }

                //video.autoplay = true;
                $("#webcam").attr("autoplay", true);
                //video.src = videoSource;
                $("#webcam").attr("src", videoSource);


            },
            function() {
                alert('There has been a problem retrieving the streams - did you allow access?');
            });
    } else {
        alert('getUserMedia is not supported in this browser.');
    }

});