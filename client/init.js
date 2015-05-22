//file:/client/init.js
Meteor.startup(function() {
    Uploader.uploadUrl = Meteor.absoluteUrl("upload"); // Cordova needs absolute URL
});