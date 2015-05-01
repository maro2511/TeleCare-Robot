/**
 * Created by Sergey on 01/05/2015.
 */

$(document).ready(function(){

    // jQuery methods go here...

    // Get a reference to our posts

    $("#firebaseConnectButton").click(function (){

        var firebase_addr = $("#server_addr").val();
        console.log("Firebase addr = " + firebase_addr);

        var ref = new Firebase(firebase_addr);
        var users_ref = ref.child("users");
        // Attach an asynchronous callback to read the data at our posts reference
        users_ref.on("value", function(snapshot) {
            for (var key in snapshot.val()) {
                console.log(key);
                $("#robot_id_select").append(
                    "<li role=\"presentation\"><a role=\"menuitem\" tabindex=\"-1\" href=\"#\" id=\"" +
                    key +
                    "\">" + key + "</a></li>");
            }
        });

    });


    var current_robot;

    $("#robot_id_select").on("click", "a", (function (){
        //console.log("zzzz");
        //console.log($(this).text());
        current_robot = $(this).text();
        console.log("Robot with id = " + current_robot + " selected.");
    }));


    //$("#server_addr").



});