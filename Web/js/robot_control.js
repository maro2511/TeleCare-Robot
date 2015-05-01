/**
 * Created by Sergey on 01/05/2015.
 */

function database_connect(url) {

    console.log("Firebase addr = " + url);
    var ref = new Firebase(url);
    return ref;
}

function database_retreive_users(users_ref) {

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
}

$(document).ready(function(){

    // jQuery methods go here...

    // Get a reference to our posts
    var ref;
    var users_ref;

    $("#firebaseConnectButton").click(function (){

        ref = database_connect($("#server_addr").val());
        users_ref = ref.child("users");
        database_retreive_users(users_ref);

    });


    var current_robot;

    $("#robot_id_select").on("click", "a", (function (){
        //console.log("zzzz");
        //console.log($(this).text());
        current_robot = $(this).text();
        $("#dropdownMenu1").text(current_robot);
        console.log("Robot with id = " + current_robot + " selected.");

        //users_ref.child(current_robot + "robot_respone").on("child_changed")
    }));


    //$("#server_addr").



});