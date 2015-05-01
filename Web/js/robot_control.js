/**
 * Created by Sergey on 01/05/2015.
 */

$(document).ready(function(){

    // jQuery methods go here...

    // Get a reference to our posts
    var ref = new Firebase("https://torrid-heat-7030.firebaseio.com/users");
// Attach an asynchronous callback to read the data at our posts reference
    ref.on("value", function(snapshot) {
        for (var key in snapshot.val()) {
            console.log(key);
            $("#robot_id_select").append(
                "<li role=\"presentation\"><a role=\"menuitem\" tabindex=\"-1\" href=\"#\">" + key + "</a></li>");
        }
    });



});