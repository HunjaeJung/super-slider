//file:/server/init.js
Meteor.startup(function () {
    UploadServer.init({
        tmpDir: process.env.PWD + '/.uploads/tmp',
        uploadDir: process.env.PWD + '/.uploads/',
        checkCreateDirectories: true, //create the directories for you
        //getDirectory: function(fileInfo, formData) {
        //    // create a sub-directory in the uploadDir based on the content type (e.g. 'images')
        //    return formData.contentType;
        //},
        finished: function(fileInfo, formFields) {
            // perform a disk operation
            //python code
            console.log('image uploaded');
            console.dir(fileInfo);
        },
        cacheTime: 100,
        mimeTypes: {
            "xml": "application/xml",
            "vcf": "text/x-vcard"
        }
    })
});