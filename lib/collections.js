UploadedImage = new Mongo.Collection('uploaded_image');


if(Meteor.isClient){
    /*
    function UserRecordController(){
        this.BrowserLocalStorage = localStorage;
    }

    UserRecordController.prototype = {
        getUserRecord: function(){
            var self = this;
            var userRecord = self.BrowserLocalStorage.getItem('userId');
            userRecord = JSON.parse(userRecord);
            return userRecord;
        },
        setNewUserRecord: function(record){
            var self = this;
            var userRecord = JSON.stringify(record);
            self.BrowserLocalStorage.setItem('userId', userRecord);
        }
    }

    var controller = new UserRecordController();

    Meteor.startup(function(){
        var userRecord = controller.getUserRecord();

        if(!userRecord){
            var tempUserId = Random.id();
            var user = {
                userId: tempUserId,
                createdAt: new Date()
            }

            controller.setNewUserRecord(user);
        }

        Session.set("userId", userRecord.userId);
    });
    */
}

if(Meteor.isServer){
    UploadedImage.allow({
        insert: function(userId, doc){
            return true;
        },
        update: function(userId, doc, fieldNames, modifier){
            return true;
        },
        remove: function(userId, doc){
            return true;
        }
    });

    Meteor.publish('UploadedImage', function(){
        return UploadedImage.find();
    });
}
